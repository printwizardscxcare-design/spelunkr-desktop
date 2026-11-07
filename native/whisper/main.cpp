#include "whisper.h"
#include "ggml-backend.h"
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cctype>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <cstring>
#include <mutex>
#include <sstream>
#include <stdexcept>
#include <thread>
#include <vector>
#ifdef _WIN32
#include <windows.h>
#include <audioclient.h>
#include <mmdeviceapi.h>
#include <wrl/client.h>
#include <fcntl.h>
#include <io.h>
#endif

namespace fs = std::filesystem;
static std::atomic<bool> running{true};
static std::mutex output_mutex;
static std::string json_string(const std::string &s) {
    std::string out = "\"";
    for (unsigned char c : s) {
        if (c == '"' || c == '\\') { out += '\\'; out += c; }
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else if (c >= 32) out += c;
    }
    return out + '"';
}
static void emit(const std::string &type, const std::string &text) {
    std::lock_guard<std::mutex> lock(output_mutex);
    std::cout << "{\"type\":" << json_string(type) << ",\"text\":" << json_string(text) << "}" << std::endl;
}
static fs::path executable_dir(const char *arg) {
#ifdef _WIN32
    wchar_t buffer[32768];
    DWORD length = GetModuleFileNameW(nullptr, buffer, 32768);
    if (!length || length == 32768) throw std::runtime_error("Cannot locate caption resources");
    return fs::path(std::wstring(buffer, length)).parent_path();
#else
    return fs::canonical(arg).parent_path();
#endif
}
static std::vector<float> read_wav(const fs::path &file) {
    std::ifstream in(file, std::ios::binary);
    char header[12]; in.read(header, 12);
    if (!in || std::string(header, 4) != "RIFF" || std::string(header + 8, 4) != "WAVE") throw std::runtime_error("Invalid WAV fixture");
    bool format_ok = false;
    while (in) {
        char tag[4]; uint32_t size = 0;
        in.read(tag, 4); in.read(reinterpret_cast<char *>(&size), 4);
        if (!in || size > 64 * 1024 * 1024) break;
        std::vector<char> chunk(size); in.read(chunk.data(), size);
        if (!in) break;
        if (std::string(tag, 4) == "fmt " && size >= 16) {
            auto u16 = [&](int i) { return uint16_t(uint8_t(chunk[i])) | uint16_t(uint8_t(chunk[i+1])) << 8; };
            uint32_t rate = uint8_t(chunk[4]) | uint32_t(uint8_t(chunk[5])) << 8 | uint32_t(uint8_t(chunk[6])) << 16 | uint32_t(uint8_t(chunk[7])) << 24;
            format_ok = u16(0) == 1 && u16(2) == 1 && rate == 16000 && u16(14) == 16;
        }
        if (std::string(tag, 4) == "data") {
            if (!format_ok) throw std::runtime_error("Audio must be 16 kHz mono signed 16-bit PCM");
            std::vector<float> samples(size / 2);
            for (size_t i=0; i<samples.size(); ++i) samples[i] = int16_t(uint16_t(uint8_t(chunk[2*i])) | uint16_t(uint8_t(chunk[2*i+1])) << 8) / 32768.f;
            return samples;
        }
        if (size & 1) in.get();
    }
    throw std::runtime_error("Missing WAV audio");
}

class Recognizer {
    whisper_context *ctx = nullptr;
    whisper_vad_context *vad = nullptr;
    std::deque<std::string> history;
    std::mutex mutex;
    std::condition_variable available;
    std::deque<std::vector<float>> queue;
    std::thread worker;
    std::vector<float> phrase, pending, preroll;
    int quiet = 0, voiced = 0;
    bool speech_active = false;
    bool fast = false, compact_context = true;
    static std::string key(std::string word) {
        std::string result;
        for (unsigned char c : word) if (std::isalnum(c)) result += char(std::tolower(c));
        return result;
    }
public:
    Recognizer(const fs::path &root, const std::string &model, bool full_context = false)
        : fast(model == "tiny.en"), compact_context(!full_context) {
        auto cp = whisper_context_default_params(); cp.use_gpu = false;
        ctx = whisper_init_from_file_with_params((root / ("ggml-" + model + "-q5_1.bin")).u8string().c_str(), cp);
        if (!ctx) throw std::runtime_error("The bundled Whisper model could not load. Reinstall the app.");
        auto vp = whisper_vad_default_context_params(); vp.use_gpu = false; vp.n_threads = 1;
        vad = whisper_vad_init_from_file_with_params((root / "ggml-silero-v6.2.0.bin").u8string().c_str(), vp);
        if (!vad) { whisper_free(ctx); ctx = nullptr; throw std::runtime_error("The speech detection model could not load."); }
    }
    ~Recognizer() {
        running = false; available.notify_all();
        if (worker.joinable()) worker.join();
        whisper_vad_free(vad); whisper_free(ctx);
    }
    std::string decode(const std::vector<float> &audio) {
        auto p = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
        p.n_threads = std::max(1u, std::min(4u, std::thread::hardware_concurrency()));
        p.language = "en"; p.translate = false; p.no_context = true;
        p.print_realtime = p.print_progress = p.print_timestamps = p.print_special = false;
        p.suppress_blank = true; p.suppress_nst = true; p.temperature_inc = 0;
        if (fast) {
            p.no_timestamps = true; p.single_segment = true; p.greedy.best_of = 1;
            if (audio.size() <= 48000) p.max_tokens = 48;
            // Short live chunks don't need the encoder's full 30-second window.
            // Leave at least a second of padding and round up to a whole block.
            const int frames = int((audio.size() + 319) / 320);
            if (compact_context) p.audio_ctx = std::min(1500, std::max(256, ((frames + 50 + 63) / 64) * 64));
        }
        p.abort_callback = [](void *) { return !running.load(); };
        if (whisper_full(ctx, p, audio.data(), int(audio.size())) != 0) {
            if (running) throw std::runtime_error("Whisper could not process this audio.");
            return "";
        }
        std::string text;
        for (int i = 0; i < whisper_full_n_segments(ctx); ++i) {
            if (whisper_full_get_segment_no_speech_prob(ctx, i) < .65f) text += whisper_full_get_segment_text(ctx, i);
        }
        return text;
    }
    void append(const std::string &text) {
        std::istringstream input(text); std::vector<std::string> words; std::string word;
        while (input >> word) words.push_back(word);
        size_t overlap = std::min({size_t(12), words.size(), history.size()});
        for (; overlap > 0; --overlap) {
            bool match = true;
            for (size_t i=0; i<overlap; ++i) if (key(history[history.size()-overlap+i]) != key(words[i])) { match=false; break; }
            if (match) break;
        }
        for (size_t i=overlap; i<words.size(); ++i) history.push_back(words[i]);
        while (history.size() > 512) history.pop_front();
        std::string snapshot;
        for (const auto &item : history) { if (!snapshot.empty()) snapshot += ' '; snapshot += item; }
        if (!words.empty()) emit("caption", snapshot);
    }
    void start() {
        worker = std::thread([this] {
            try {
                while (running) {
                    std::vector<float> audio;
                    { std::unique_lock<std::mutex> lock(mutex);
                      available.wait(lock, [this] { return !running || !queue.empty(); });
                      if (!running) break;
                      audio = std::move(queue.front()); queue.pop_front(); }
                    auto text = decode(audio);
                    if (running) append(text);
                }
            } catch (const std::exception &e) { emit("error", e.what()); running = false; }
        });
    }
    void submit() {
        if (voiced >= 4) {
            std::lock_guard<std::mutex> lock(mutex);
            if (!queue.empty()) {
                queue.pop_front(); emit("status", "Catching up with live audio...");
            }
            queue.push_back(phrase); available.notify_one();
        }
    }
    void feed(const float *samples, size_t count) {
        pending.insert(pending.end(), samples, samples + count);
        size_t consumed = 0;
        while (running && pending.size() - consumed >= 512) {
            const float *frame = pending.data() + consumed;
            if (!whisper_vad_detect_speech_no_reset(vad, frame, 512)) throw std::runtime_error("Speech detection failed");
            float probability = whisper_vad_n_probs(vad) ? whisper_vad_probs(vad)[0] : 0;
            bool speech = probability >= .5f;
            if (speech && !speech_active) { speech_active=true; emit("activity","speech"); }
            if (speech && phrase.empty()) { phrase = preroll; quiet = voiced = 0; }
            if (!phrase.empty() || speech) {
                phrase.insert(phrase.end(), frame, frame + 512);
                if (speech) { voiced++; quiet=0; } else quiet++;
                if (quiet >= (fast ? 8 : 16)) {
                    submit(); phrase.clear(); quiet=voiced=0;
                    if (speech_active) { speech_active=false; emit("activity","silence"); }
                }
                else if (phrase.size() >= (fast ? 24576u : 40960u)) {
                    submit(); phrase.erase(phrase.begin(), phrase.end() - (fast ? 8192 : 4096)); voiced=1;
                }
            }
            preroll.insert(preroll.end(), frame, frame+512);
            if (preroll.size() > 4096) preroll.erase(preroll.begin(), preroll.end()-4096);
            consumed += 512;
        }
        pending.erase(pending.begin(), pending.begin()+consumed);
    }
    void wake() { available.notify_all(); }
};

#ifdef _WIN32
using Microsoft::WRL::ComPtr;
static void check(HRESULT hr) { if (FAILED(hr)) { std::ostringstream s; s << "Speaker capture failed (0x" << std::hex << uint32_t(hr) << "). Check your output device and toggle captions again."; throw std::runtime_error(s.str()); } }
static void capture_windows(Recognizer &recognizer) {
    check(CoInitializeEx(nullptr, COINIT_MULTITHREADED));
    ComPtr<IMMDeviceEnumerator> enumerator; ComPtr<IMMDevice> device;
    ComPtr<IAudioClient> client; ComPtr<IAudioCaptureClient> capture;
    check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumerator)));
    check(enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device));
    check(device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, reinterpret_cast<void **>(client.GetAddressOf())));
    WAVEFORMATEX *mix=nullptr; check(client->GetMixFormat(&mix));
    std::unique_ptr<WAVEFORMATEX, decltype(&CoTaskMemFree)> format(mix, CoTaskMemFree);
    WORD encoding=mix->wFormatTag;
    if (encoding==WAVE_FORMAT_EXTENSIBLE && mix->cbSize>=22) encoding=WORD(reinterpret_cast<WAVEFORMATEXTENSIBLE *>(mix)->SubFormat.Data1);
    if ((encoding!=WAVE_FORMAT_PCM && encoding!=WAVE_FORMAT_IEEE_FLOAT) || !mix->nChannels || !mix->nSamplesPerSec ||
        (mix->wBitsPerSample!=16 && mix->wBitsPerSample!=24 && mix->wBitsPerSample!=32) ||
        (encoding==WAVE_FORMAT_IEEE_FLOAT && mix->wBitsPerSample!=32)) throw std::runtime_error("This speaker format is unsupported. Try a standard 16-bit or 32-bit audio output format in Windows Sound settings.");
    check(client->Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, 1000000, 0, mix, nullptr));
    const double samples_per_output=mix->nSamplesPerSec/16000.0;
    double weighted=0, weight=0;
    auto last_packet=std::chrono::steady_clock::now(), last_silence=last_packet;
    check(client->GetService(IID_PPV_ARGS(&capture))); check(client->Start());
    emit("status", "Listening to speakers - local Whisper captions");
    try {
        while (running) {
            UINT32 frames=0; check(capture->GetNextPacketSize(&frames));
            if (!frames) {
                auto now=std::chrono::steady_clock::now();
                if (now-last_packet>=std::chrono::milliseconds(300) && now-last_silence>=std::chrono::milliseconds(32)) {
                    float silence[512]{}; recognizer.feed(silence,512); last_silence=now;
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(5)); continue;
            }
            last_packet=std::chrono::steady_clock::now();
            BYTE *data=nullptr; DWORD flags=0; check(capture->GetBuffer(&data, &frames, &flags, nullptr, nullptr));
            std::vector<float> audio;
            for (UINT32 i=0; i<frames; ++i) {
                float mono=0;
                if (!(flags & AUDCLNT_BUFFERFLAGS_SILENT)) {
                    for (WORD channel=0; channel<mix->nChannels; ++channel) {
                        const BYTE *sample=data+i*mix->nBlockAlign+channel*(mix->wBitsPerSample/8);
                        float value=0;
                        if (encoding==WAVE_FORMAT_IEEE_FLOAT) std::memcpy(&value,sample,4);
                        else if (mix->wBitsPerSample==16) { int16_t v; std::memcpy(&v,sample,2); value=v/32768.f; }
                        else if (mix->wBitsPerSample==32) { int32_t v; std::memcpy(&v,sample,4); value=float(v/2147483648.0); }
                        else { int32_t v=int32_t(sample[0]) | int32_t(sample[1])<<8 | int32_t(sample[2])<<16; if (v&0x800000) v|=int32_t(0xff000000); value=v/8388608.f; }
                        if (std::isfinite(value)) mono+=value/mix->nChannels;
                    }
                }
                double remaining=1;
                while (remaining>1e-9) {
                    double take=std::min(remaining,samples_per_output-weight);
                    weighted+=mono*take; weight+=take; remaining-=take;
                    if (weight>=samples_per_output-1e-9) { audio.push_back(float(weighted/samples_per_output)); weighted=weight=0; }
                }
            }
            check(capture->ReleaseBuffer(frames)); recognizer.feed(audio.data(), audio.size());
        }
    } catch (...) { client->Stop(); throw; }
    client->Stop();
}
#endif

int main(int argc, char **argv) {
    try {
        std::string model="base.en", wav; bool wasapi=false, full_context=false;
        for (int i=1; i<argc; ++i) {
            std::string arg=argv[i];
            if (arg=="--model" && i+1<argc) model=argv[++i];
            else if (arg=="--test-wav" && i+1<argc) wav=argv[++i];
            else if (arg=="--wasapi") wasapi=true;
            else if (arg=="--full-context") full_context=true;
            else if (arg!="--pcm") throw std::runtime_error("Unknown caption helper argument");
        }
        if (model!="base.en" && model!="tiny.en") throw std::runtime_error("Unknown speech model");
        whisper_log_set([](ggml_log_level, const char *, void *) {}, nullptr);
        const auto root = executable_dir(argv[0]);
        ggml_backend_load_all_from_path(root.u8string().c_str());
        emit("status", "Loading local Whisper model...");
        Recognizer recognizer(root, model, full_context);
        if (!wav.empty()) {
            auto audio=read_wav(fs::u8path(wav)); auto start=std::chrono::steady_clock::now();
            recognizer.append(recognizer.decode(audio));
            auto ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-start).count();
            emit("status", "Benchmark: " + std::to_string(audio.size()/16000.f) + " seconds of audio in " + std::to_string(ms) + " ms");
            return 0;
        }
        recognizer.start();
        if (wasapi) {
#ifdef _WIN32
            std::thread([] { std::string line; std::getline(std::cin, line); running=false; }).detach();
            capture_windows(recognizer);
#else
            throw std::runtime_error("WASAPI is only available on Windows");
#endif
        } else {
#ifdef _WIN32
            _setmode(_fileno(stdin), _O_BINARY);
#endif
            emit("status", "Listening to speakers - local Whisper captions");
            int16_t pcm[512];
            while (running && std::cin.read(reinterpret_cast<char *>(pcm), sizeof(pcm))) {
                float audio[512]; for (int i=0;i<512;++i) audio[i]=pcm[i]/32768.f;
                recognizer.feed(audio,512);
            }
        }
        running=false; recognizer.wake(); return 0;
    } catch (const std::exception &e) { running=false; emit("error",e.what()); return 1; }
}
