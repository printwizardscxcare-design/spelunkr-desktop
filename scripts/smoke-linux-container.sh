#!/bin/bash
set -euo pipefail
case "$1" in
  debian)
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y /artifacts/*.deb pulseaudio python3 nodejs xvfb xauth procps
    ;;
  fedora)
    dnf install -y /artifacts/*.rpm pulseaudio python3 nodejs xorg-x11-server-Xvfb xorg-x11-xauth procps-ng
    ;;
  arch)
    pacman -Syu --noconfirm
    pacman -S --needed --noconfirm pulseaudio python nodejs xorg-server-xvfb xorg-xauth procps-ng
    pacman -U --noconfirm /artifacts/*.pkg.tar.*
    ;;
esac
useradd -m tester
mkdir -p /tmp/runtime-tester
chown tester:tester /tmp/runtime-tester
chmod 700 /tmp/runtime-tester
su tester -s /bin/bash -c 'node /source/scripts/check-whisper.cjs "/opt/Spelunkr Desktop/resources/native/whisper/caption-reader" /artifacts/test.wav --recorded-only'
su tester -s /bin/bash -c 'node /source/scripts/check-buffered-whisper.cjs "/opt/Spelunkr Desktop/resources/native/whisper/caption-reader" /artifacts/test.wav'
su tester -s /bin/bash -c 'node /source/scripts/smoke-buffered-capture.cjs "/opt/Spelunkr Desktop/resources/native" /artifacts/test.wav'
su tester -s /bin/bash -c 'node /source/scripts/check-audio-filter.cjs "/opt/Spelunkr Desktop/resources/native/whisper/ffmpeg" /artifacts/test.wav'
# The containers run without a desktop login. Disable Chromium sandbox ONLY for
# this isolated GUI smoke check; installed application launchers keep it enabled.
su tester -s /bin/bash -c 'export XDG_RUNTIME_DIR=/tmp/runtime-tester; xvfb-run -a bash -c '\''"/opt/Spelunkr Desktop/spelunkr-desktop" --no-sandbox --ozone-platform=x11 > /tmp/spelunkr-startup.log 2>&1 & pid=$!; sleep 12; kill -0 "$pid"; kill "$pid"; wait "$pid" || true'\'''
cat /tmp/spelunkr-startup.log
echo "PASS: installed desktop app stayed running under Xvfb"
