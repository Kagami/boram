#!/usr/bin/env bash

set -ex

cd "$( dirname -- "${BASH_SOURCE[0]}" )/bin"
rm -rf youtube-dl.zip youtube-dl.exe ffmpeg-latest-win64-shared.7z ffmpeg-latest-win64-shared

wget https://yt-dl.org/latest/youtube-dl -O youtube-dl.zip
wget https://yt-dl.org/latest/youtube-dl.exe
wget https://ffmpeg.zeranoe.com/builds/win64/shared/ffmpeg-latest-win64-shared.7z && 7z x ffmpeg-latest-win64-shared.7z
