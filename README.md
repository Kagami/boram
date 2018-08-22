# boram ![](src/index/icon-big.png)

![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-source.png)
![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-encode.png)

## Features

* Open-source, cross-platform, works on Windows, Mac and Linux
* AV1/VP9/VP8/Opus/Vorbis/2pass/limit/CRF/CQ/raw-args modes support
* Industry-grade codec settings, considered defaults
* Can download source from almost any streaming site, thanks to [youtube-dl](https://rg3.github.io/youtube-dl/)
* Displays almost any video with embedded player, thanks to [mpv](https://mpv.io/)
* Hardsubbing out of the box with proper shift/track selection
* Simple yet powerful interface, source video centric design
* Multiple encodes at once in single window
* Fast filters result preview, no need to go through trial and error

## Install

### Windows

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `boram.exe`. 64-bit (x64) releases are preferred.

### macOS

Download [latest release](https://github.com/Kagami/boram/releases), unpack, right-click `boram` app in Finder, select Open and Open.

### Linux

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `./boram`. You need to have python, ffmpeg and libmpv1 installed. ffmpeg 4.x is required by default, run `mv libffmpeg.so.57 libffmpeg.so` if you have ffmpeg 3.x.

## License

boram's own code is licensed under [CC0](licenses/LICENSE.BORAM) but releases also include:

* Libraries from dependencies section of [package.json](package.json)
* [Chromium](licenses/LICENSE.CHROMIUM) and [Electron](licenses/LICENSE.ELECTRON) components
* [youtube-dl binaries](licenses/LICENSE.PYTHON)
* [FFmpeg binaries](licenses/LICENSE.FFMPEG)
* [mpv binaries](licenses/LICENSE.MPV)
* [Font Awesome font](licenses/LICENSE.FONTAWESOME)
* [Roboto font](licenses/LICENSE.ROBOTO)
