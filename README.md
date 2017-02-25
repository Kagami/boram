# boram ![](src/index/icon-big.png)

![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-source.png)
![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-encode.png)

## Features

* Open-source, cross-platform, works on Windows, Mac and Linux
* VP9/VP8/Opus/Vorbis/2pass/limit/CRF/CQ/raw-args modes support
* Industry-grade codec settings, considered defaults
* Can download source from almost any streaming site, thanks to [youtube-dl](https://rg3.github.io/youtube-dl/)
* Displays almost any video with embedded player, thanks to [mpv](https://mpv.io/)
* Supports hardsubbing out of the box, automatically setups Fontconfig on Windows
* Simple yet powerful interface, source video centric design
* Multiple encodes at once in single window
* Fast filters result preview, no need to go through trial and error

## Install

### Windows

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `boram.exe`. 64-bit (x64) releases are preferred.

### Mac OS

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `boram`.

### Linux

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `./boram`. You need to have python, ffmpeg and libmpv1 installed. ffmpeg 3.x is implied by default. Run:

* `mv libffmpeg.so.56 libffmpeg.so` if you have ffmpeg 2.x
* `mv libffmpeg-xenial.so.56 libffmpeg.so` if you have ffmpeg 2.x and Ubuntu 16.04

## License

boram's own code is licensed under [CC0](licenses/LICENSE.BORAM) but releases also include:

* Libraries from dependencies section of [package.json](package.json)
* [Chromium](licenses/LICENSE.CHROMIUM) and [Electron](licenses/LICENSE.ELECTRON) components
* [Font Awesome font](licenses/LICENSE.FONTAWESOME)
* [Roboto font](licenses/LICENSE.ROBOTO)
* [youtube-dl binaries](licenses/LICENSE.PYTHON)
* [FFmpeg binaries](licenses/LICENSE.FFMPEG)
* [mpv binaries](licenses/LICENSE.MPV)
