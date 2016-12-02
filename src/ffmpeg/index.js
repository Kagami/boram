/**
 * ffmpeg wrapper. Provides platform-independent Promise API.
 * @module boram/ffmpeg
 */

import assert from "assert";
import {makeRunner, escapeArg, quoteArgs, fixOpt, clearOpt} from "../util";
if (BORAM_WIN_BUILD) {
  require.context(
    "../../bin/ffmpeg-latest-win64-shared/bin",
    false,
    /\.dll$|[\/\\]ffmpeg\.exe$/);
}

export default makeRunner("ffmpeg", {
  setTitle({inpath, outpath, title}) {
    return this._run([
      "-v", "error", "-y",
      "-i", inpath,
      "-map", "0",
      "-c", "copy",
      "-metadata", `title=${title}`,
      "-f", "matroska", "--", outpath,
    ]);
  },
  _getVorbisBitrate(vorbisq) {
    /* eslint-disable indent */
    const bitrate = {
    "-1": 45,
       0: 64,
       1: 80,
       2: 96,
       3: 112,
       4: 128,
       5: 160,
       6: 192,
       7: 224,
       8: 256,
       9: 320,
      10: 500,
    }[vorbisq];
    /* eslint-enable indent */
    assert(bitrate);
    return bitrate;
  },
  _getVideoBitrate({limit, _duration, hasAudio, acodec, ab}) {
    if (hasAudio) {
      if (acodec === "vorbis") {
        ab = this._getVorbisBitrate(ab);
      }
    } else {
      ab = 0;
    }
    const limitKbits = limit * 8 * 1024;
    const vb = Math.floor(limitKbits / _duration - ab);
    return vb > 0 ? vb : 1;
  },
  /**
   * Escape FFmpeg filter argument (see ffmpeg-filters(1), "Notes on
   * filtergraph escaping").
   *
   * Known issues: names like :.ass, 1:.ass still don't work. Seems like
   * a bug in FFmpeg because _:.ass works ok.
   */
  _escapeFilterArg(arg) {
    arg = arg.replace(/\\/g, "\\\\");      // \ -> \\
    arg = arg.replace(/'/g, "'\\\\\\''");  // ' -> '\\\''
    arg = arg.replace(/:/g, "\\:");        // : -> \:
    return `'${arg}'`;
  },
  getRawArgs(opts) {
    const args = [];
    const scale = [];
    const crop = [];
    const vfilters = [];
    const afilters = [];
    const vb = (opts.modeLimit && !opts.modeCRF)
      ? this._getVideoBitrate(opts)
      : opts.limit;
    function maybeSet(name, value) {
      if (value != null) {
        args.push(name, value.toString());
      }
    }

    // Input.
    maybeSet("-ss", opts.start);
    args.push("-i", escapeArg(opts.inpath));
    if (opts.end != null) {
      // We always use `-t` in resulting command because `-ss` before
      // `-i` resets timestamps, see:
      // <https://trac.ffmpeg.org/wiki/Seeking#Notes>.
      args.push("-t", opts._duration.toFixed(3));
    }

    // Streams.
    args.push("-map", `0:V:${opts.vtrackn}`);
    if (opts.hasAudio) {
      // TODO(Kagami): External track.
      args.push("-map", `0:a:${opts.atrackn}`);
    }

    // Video.
    args.push("-threads", "8");
    if (opts.vcodec === "vp9") {
      args.push("-c:v", "libvpx-vp9", "-speed", "1");
      // tile-columns=6 by default but won't harm.
      args.push("-tile-columns", "6");
      // frame-parallel should be disabled.
      args.push("-frame-parallel", "0");
    } else if (opts.vcodec === "vp8") {
      // TODO(Kagami): Auto-insert colormatrix conversion?
      // TODO(Kagami): Slices?
      args.push("-c:v", "libvpx", "-speed", "0");
    } else {
      assert(false);
    }
    args.push("-b:v", vb ? `${vb}k` : "0");
    maybeSet("-crf", opts.quality);
    // Enabled for VP9 by default but always force it just in case.
    args.push("-auto-alt-ref", "1", "-lag-in-frames", "25");
    // Bigger keyframe interval saves bitrate but a lot of users will
    // complain if they can't seek video and savings are not that high
    // compared to disadvantages. It's still possible to enter any
    // advanced options in raw args field.
    // It should be default for both VP8 and VP9 in latest libvpx,
    // passing it anyway for compatibility with old versions.
    args.push("-g", "128");
    // Using other subsamplings require profile>0 which support
    // across various decoders is still poor.
    args.push("-pix_fmt", "yuv420p");

    // Video filters.
    // Deinterlacing must be always first.
    if (opts.deinterlace) {
      vfilters.push("yadif");
    }
    // Any combination of crop params is ok.
    if (opts.cropw != null) {
      crop.push(`w=${opts.cropw}`);
    }
    if (opts.croph != null) {
      crop.push(`h=${opts.croph}`);
    }
    if (opts.cropx != null) {
      crop.push(`x=${opts.cropx}`);
    }
    if (opts.cropy != null) {
      crop.push(`y=${opts.cropy}`);
    }
    if (crop.length) {
      vfilters.push(`crop=${crop.join(":")}`);
    }
    // Both values must be set if any is specified.
    // TODO(Kagami): clear SAR?
    if (opts.scalew != null || opts.scaleh != null) {
      scale.push(opts.scalew == null ? -1 : opts.scalew);
      scale.push(opts.scaleh == null ? -1 : opts.scaleh);
      vfilters.push(`scale=${scale.join(":")}`);
    }
    if (opts.burnSubs) {
      // Workaround for <https://trac.ffmpeg.org/ticket/2067>.
      if (opts._start) {
        vfilters.push(`setpts=PTS+${opts._start}/TB`);
      }
      // TODO(Kagami): External track.
      const subpath = this._escapeFilterArg(opts.inpath);
      vfilters.push(`subtitles=${subpath}:si=${opts.strackn}`);
      if (opts._start) {
        vfilters.push("setpts=PTS-STARTPTS");
      }
    }
    if (opts.speed) {
      // TODO(Kagami): Fix FPS and duration.
      // TODO(Kagami): Does it work with subtitles?
      vfilters.push(`setpts=PTS*${opts.speed}`);
    }
    if (vfilters.length) {
      args.push("-vf", escapeArg(vfilters.join(",")));
    }

    if (opts.hasAudio) {
      // Audio.
      if (opts.acodec === "opus") {
        args.push("-c:a", "libopus");
        args.push("-b:a", `${opts.ab}k`);
      } else if (opts.acodec === "vorbis") {
        args.push("-c:a", "libvorbis");
        args.push("-q:a", opts.ab.toString());
      } else {
        assert(false);
      }
      const atrack = opts.atracks[opts.atrackn];
      if (atrack.channels > 2) {
        args.push("-ac", "2");
      }

      // Audio filters.
      // Amplify should go before fade.
      if (opts.amplify) {
        afilters.push(`acompressor=makeup=${opts.amplify}`);
      }
      if (opts.fadeIn) {
        afilters.push(`afade=t=in:d=${opts.fadeIn}`);
      }
      if (opts.fadeOut) {
        const startTime = (opts._duration - opts.fadeOut).toFixed(3);
        afilters.push(`afade=t=out:d=${opts.fadeOut}:st=${startTime}`);
      }
      if (afilters.length) {
        args.push("-af", afilters.join(","));
      }
    }

    return args;
  },
  _getCommonArgs(rawArgs) {
    const args = rawArgs.filter(arg => typeof arg === "string");
    args.unshift("-hide_banner", "-nostdin", "-y");
    return args;
  },
  getPreviewArgs({rawArgs, outpath}) {
    const args = this._getCommonArgs(rawArgs);
    fixOpt(args, "-c:v", "libx264");
    fixOpt(args, "-crf", "18", {add: true});
    // Not needed or libvpx-specific.
    clearOpt(args, [
      "-b:v",
      "-speed",
      "-tile-columns",
      "-frame-parallel",
      "-auto-alt-ref",
      "-lag-in-frames",
      "-g",
    ]);
    args.push("-preset", "ultrafast");
    args.push("-f", "matroska", "--", outpath);
    return args;
  },
  getEncodeArgs({rawArgs, passn, passlog, outpath}) {
    const args = this._getCommonArgs(rawArgs);
    if (passn === 1) {
      // <http://wiki.webmproject.org/ffmpeg/vp9-encoding-guide>.
      fixOpt(args, "-speed", "4");
      // Should be without suffix.
      passlog = passlog.slice(0, -6);
      args.push("-an", "-pass", "1", "-passlogfile", passlog);
      args.push("-f", "null", "-");
    } else if (passn === 2) {
      passlog = passlog.slice(0, -6);
      args.push("-pass", "2", "-passlogfile", passlog);
      args.push("-f", "webm", "--", outpath);
    } else if (passn === 0) {
      args.push("-f", "webm", "--", outpath);
    } else {
      assert(false);
    }
    return args;
  },
  showArgs(args) {
    return `$ ffmpeg ${quoteArgs(args)}\n`;
  },
});
