#pragma once
#include <algorithm>
#include <cctype>
#include <cstdint>
#include <deque>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

struct TranscriptSnapshot {
    std::string text;
    uint64_t word_offset = 0, utterance_start = 0, utterance_id = 0;
};

// Re-decode a growing utterance, publishing the prefix agreed by two results.
// A final result at a pause includes the remaining words. This avoids chopping
// every second of speech into independent, context-free transcripts.
class Transcript {
    std::deque<std::string> history;
    std::vector<std::string> previous, displayed;
    size_t limit;
    uint64_t offset = 0, current_id = 0, current_start = 0;
    bool committed = true, continuing = false;
    std::string last_text;
    uint64_t last_offset = 0;
    static std::string key(const std::string &word) {
        std::string result;
        for (unsigned char c : word) if (std::isalnum(c)) result += char(std::tolower(c));
        return result;
    }
    static std::vector<std::string> words(const std::string &text) {
        std::istringstream input(text);std::vector<std::string> result;std::string word;
        while (input >> word) if (!key(word).empty()) result.push_back(word);
        return result;
    }
    static bool repetitive(const std::vector<std::string> &text) {
        if (text.size() < 16) return false;
        for (size_t width = 1; width <= 4; ++width) {
            size_t matching = 0;
            for (size_t i = width; i < text.size(); ++i) {
                matching = key(text[i]) == key(text[i-width]) ? matching + 1 : 0;
                if (matching >= std::max(size_t(15), width * 5)) return true;
            }
        }
        return false;
    }
    void commit() {
        if (committed) return;
        history.insert(history.end(), displayed.begin(), displayed.end());
        while (history.size() > limit) {history.pop_front();offset++;}
        displayed.clear();committed = true;
    }
public:
    explicit Transcript(size_t history_limit = 512) : limit(history_limit) {}
    std::optional<TranscriptSnapshot> update(uint64_t id, const std::string &text, bool final, bool continuation = false) {
        if (id != current_id) {
            commit();current_id = id;current_start = offset + history.size();
            previous.clear();displayed.clear();committed = false;continuing = continuation;
        }
        auto next = words(text);
        if (repetitive(next)) {if (final) commit();return std::nullopt;}
        if (continuing) {
            size_t overlap = std::min({size_t(12), next.size(), history.size()});
            for (; overlap > 0; --overlap) {
                bool match = true;
                for (size_t i=0;i<overlap;++i) if (key(history[history.size()-overlap+i]) != key(next[i])) {match=false;break;}
                if (match) break;
            }
            next.erase(next.begin(), next.begin() + overlap);
        }
        size_t agreed = 0;
        if (final) agreed = next.size();
        else while (agreed < previous.size() && agreed < next.size() && key(previous[agreed]) == key(next[agreed])) agreed++;
        previous = next;
        if (agreed) displayed.assign(next.begin(), next.begin() + agreed);
        if (final) commit();
        std::string snapshot;
        const auto add = [&](const std::string &word) {if (!snapshot.empty()) snapshot += ' ';snapshot += word;};
        for (const auto &word : history) add(word);
        for (const auto &word : displayed) add(word);
        if (snapshot.empty() || snapshot == last_text && offset == last_offset) return std::nullopt;
        last_text = snapshot;last_offset = offset;
        return TranscriptSnapshot{snapshot, offset, current_start, current_id};
    }
};
