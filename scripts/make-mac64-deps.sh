#!/bin/bash

set -ex
cd "$( dirname "${BASH_SOURCE[0]}" )"
rm -rf dist
mkdir dist

# TODO(Kagami): Edit formulae for fribidi[-glib,-pcre], freetype[-png].
# Need libvpx-HEAD for:
# - <https://groups.google.com/a/webmproject.org/forum/#!topic/codec-devel/oiHjgEdii2U>
brew install libass --build-from-source --without-harfbuzz
brew install libvpx --HEAD --with-highbitdepth
brew install ffmpeg --without-lame --without-xvid --with-libvpx --with-libvorbis --with-opus --with-libass
brew install mpv --without-jpeg --without-little-cms2 --without-lua --without-youtube-dl

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
install_name_tool -change /System/Library/Frameworks/CoreImage.framework/Versions/A/CoreImage /System/Library/Frameworks/QuartzCore.framework/Versions/A/Frameworks/CoreImage.framework/Versions/A/CoreImage dist/libavfilter.6.dylib
