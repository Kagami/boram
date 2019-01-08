#!/bin/bash

set -ex
cd "$( dirname "${BASH_SOURCE[0]}" )"
rm -rf dist
mkdir dist

brew install libass -s  # Without harfbuzz
brew install libvpx --HEAD  # highbitdepth
brew install aom --HEAD  # lowbitdepth
brew install dav1d --HEAD
brew install ffmpeg --HEAD --with-libass --with-aom --with-dav1d  # Without lame, sdl2, snappy, theora, x265, xvid, xz
brew install mpv -s  # Without jpeg, little-cms2, lua, mujs, youtube-dl

DEPS="
/usr/local/bin/ffmpeg
/usr/local/bin/ffprobe
/usr/local/lib/libmpv.1.dylib
"

copy_deps() {
  local dep=$1
  local depname=$(basename $dep)
  [[ -e dist/$depname ]] || install -m755 $dep dist
  otool -L $dep | awk '/\/usr\/local.*\.dylib /{print $1}' | while read lib; do
    local libname=$(basename $lib)
    [[ $depname = $libname ]] && continue
    echo $libname
    install_name_tool -change $lib @loader_path/$libname dist/$depname
    [[ -e dist/$libname ]] && continue
    install -m755 $lib dist
    copy_deps $lib
  done
}

set +x
for dep in $DEPS; do
  copy_deps $dep
done

set -x
# See <https://github.com/Kagami/boram/issues/11>.
install_name_tool -change /System/Library/Frameworks/CoreImage.framework/Versions/A/CoreImage /System/Library/Frameworks/QuartzCore.framework/Versions/A/Frameworks/CoreImage.framework/Versions/A/CoreImage dist/libavfilter.7.dylib
