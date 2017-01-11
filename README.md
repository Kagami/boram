# boram ![](src/index/icon.png)

![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-source.png)
![](https://raw.githubusercontent.com/Kagami/boram/assets/boram-encode.png)

## Features

* Open-source, cross-platform, works on Windows and Linux
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

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `boram.exe`.

### Linux

Download [latest release](https://github.com/Kagami/boram/releases), unpack and run `./boram`. You need to have python, ffmpeg and libmpv installed.

ffmpeg 3.x is required by default. Run `mv libffmpeg.so.56 libffmpeg.so` if you have ffmpeg 2.x.

## License

boram's own code is licensed under [CC0](licenses/LICENSE.BORAM) but releases also include:

* Libraries from dependencies section of [package.json](package.json)
* [Roboto font](licenses/LICENSE.ROBOTO)
* [Font Awesome font](licenses/LICENSE.FONTAWESOME)
* [youtube-dl binaries](licenses/LICENSE.PYTHON)
* [Zeranoe FFmpeg binaries](licenses/LICENSE.FFMPEG)
* [lachs0r mpv binaries](licenses/LICENSE.MPV)
* [Chromium](licenses/LICENSE.CHROMIUM) and [Electron](licenses/LICENSE.ELECTRON) components
