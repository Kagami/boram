# boram ![](src/index/icon.png)

![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-source.png)
![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-encode.png)

## Features

* Open-source, cross-platform, works on Windows and Linux
* VP9/VP8/Opus/Vorbis/2pass/limit/CRF/CQ/raw-args support
* Industry-grade codec settings, considered defaults
* Can download source from almost any streaming site, thanks to [youtube-dl](https://rg3.github.io/youtube-dl/)
* Can show almost any source with internal player, thanks to [mpv](https://mpv.io/)
* Simple yet powerful interface, source video centric design
* Multiple encodes at once in single window
* Most popular effects are built-in and possible to use [any available ffmpeg filter](https://ffmpeg.org/ffmpeg-filters.html)
* Fast filters result preview, no need to go through trial and error
* And more…

## Install

### Windows

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `boram.exe`.

### Linux

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `./boram`.  
**NOTE:** You need Python (2 or 3) and FFmpeg (2+, with libvpx 1.5.0+) installed.

## License

boram's own code is licensed under [CC0](legal/LICENSE.BORAM) but releases also include:

* Libraries from dependencies section of [package.json](package.json)
* [Roboto font](legal/LICENSE.ROBOTO)
* [Font Awesome font](legal/LICENSE.FONTAWESOME)
* [youtube-dl binaries](legal/LICENSE.PYTHON)
* [Zeranoe FFmpeg binaries](legal/LICENSE.FFMPEG)
* [lachs0r mpv binaries](legal/LICENSE.MPV)
* [Chromium](legal/LICENSE.CHROMIUM) and [Electron](legal/LICENSE.ELECTRON) components
