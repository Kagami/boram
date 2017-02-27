/**
 * ffmpeg wrapper. Provides platform-independent Promise API.
 * @module boram/ffmpeg
 */

import assert from "assert";
import fs from "fs";
import os from "os";
import {ceilFixed, makeRunner, escapeArg, fixOpt, clearOpt} from "../util";
if (BORAM_WIN_BUILD) {
  if (BORAM_X64_BUILD) {
    require.context("../../bin/win64/bin-video", false,
                    /\.dll$|[\/\\]ffmpeg\.exe$/);
  } else {
    require.context("../../bin/win32/bin-video", false,
                    /\.dll$|[\/\\]ffmpeg\.exe$/);
  }
} else if (BORAM_MAC_BUILD) {
  require.context("../../bin/mac64", false, /\.dylib$|[\/\\]ffmpeg$/);
}

export default makeRunner("ffmpeg", {
  /**
   * Escape FFmpeg's filename argument.
   * In particular paths like ":" and "-" are processed differently.
   * Note that you should not use this function if you really need
   * stdin/non-file protocol.
   */
  _escapeFilename(fpath) {
    return `file:${fpath}`;
  },
  /**
   * Escape FFmpeg's filter argument.
   * See ffmpeg-filters(1), "Notes on filtergraph escaping".
   */
  _escapeFilterArg(arg) {
    arg = arg.replace(/\\/g, "\\\\");      // \ -> \\
    arg = arg.replace(/'/g, "'\\\\\\''");  // ' -> '\\\''
    arg = arg.replace(/:/g, "\\:");        // : -> \:
    return `'${arg}'`;
  },
  /**
   * Escape FFmpeg's concat demuxer path argument.
   * See ffmpeg-formats(1), "concat".
   */
  _escapeConcatArg(arg) {
    arg = arg.replace(/'/g, "'\\''");  // ' -> '\''
    return `file '${arg}'`;
  },
  hasInterlace({inpath, vtrackn, start}) {
    // TODO(Kagami): BFF?
    start = (start + 5).toString();
    return this._run([
      "-v", "error", "-nostdin", "-y",
      "-ss", start, "-i", this._escapeFilename(inpath),
      "-map", `0:v:${vtrackn}`,
      "-vf", "idet,metadata=print:lavfi.idet.multiple.tff:file=-",
      "-frames:v", "10", "-f", "null", "-",
    ]).then(log => {
      const lines = log.trim().split(/\r?\n/g).reverse();
      for (const line of lines) {
        const match = line.match(/^lavfi.idet.multiple.tff=(\d+)/);
        if (match) {
          // At least 4 of 10 frames are interlaced.
          return parseInt(match[1], 10) > 3;
        }
      }
      return false;
    });
  },
  getCropArea({inpath, vtrackn, start}) {
    start = (start + 5).toString();
    return this._run([
      "-v", "error", "-nostdin", "-y",
      "-ss", start, "-i", this._escapeFilename(inpath),
      "-map", `0:v:${vtrackn}`,
      "-vf", "cropdetect=round=2,metadata=print:file=-",
      "-frames:v", "3", "-f", "null", "-",
    ]).then(log => {
      // OK to fail here, caller will just ignore us.
      const w = +log.match(/^lavfi.cropdetect.w=(\d+)/m)[1];
      const h = +log.match(/^lavfi.cropdetect.h=(\d+)/m)[1];
      const x = +log.match(/^lavfi.cropdetect.x=(\d+)/m)[1];
      const y = +log.match(/^lavfi.cropdetect.y=(\d+)/m)[1];
      return {w, h, x, y};
    });
  },
  /** In Kbps. */
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
  /** In Kbps. */
  getVideoBitrate({modeLimit, modeCRF, limit, _duration,
                   hasAudio, acodec, ab}) {
    if (!modeLimit || modeCRF) return limit;
    if (hasAudio) {
      if (acodec === "vorbis") {
        ab = this._getVorbisBitrate(ab);
      } else if (acodec === "copy") {
        // TODO(Kagami): ffprobe doesn't return "bit_rate" field per
        // stream for some reason, so use approximation. Find some
        // better way instead.
        ab = 320;
      }
    } else {
      ab = 0;
    }
    const limitKbits = limit * 8 * 1024;
    const vb = Math.floor(limitKbits / _duration - ab);
    return Math.max(1, vb);
  },
  getRawArgs(opts) {
    const args = [];
    const crop = [];
    const scale = [];
    const subtitles = [];
    const vfilters = [];
    const afilters = [];

    // Input.
    if (opts.start != null) {
      args.push("-ss", opts.start);
    }
    args.push("-i", escapeArg(this._escapeFilename(opts.inpath)));
    if (opts.start != null && opts.hasAudio && opts.acodec === "copy") {
      // Make resulting video begin in zero timestamp. This is only
      // needed when we copy audio.
      args.push("-ss", "0");
    }
    if (opts.end != null) {
      args.push("-t", ceilFixed(opts._duration, 3));
    }

    // Streams.
    args.push("-map", `0:v:${opts.vtrackn}`);
    if (opts.hasAudio) {
      args.push("-map", `0:a:${opts.atrackn}`);
    }

    // Video.
    args.push("-threads", os.cpus().length);
    if (opts.vcodec === "vp9") {
      args.push("-c:v", "libvpx-vp9", "-speed", "1");
      // In case default will change.
      args.push("-tile-columns", "6");
      // frame-parallel should be disabled.
      args.push("-frame-parallel", "0");
    } else if (opts.vcodec === "vp8") {
      // TODO(Kagami): Tune slices setting?
      args.push("-c:v", "libvpx", "-speed", "0");
    } else {
      assert(false);
    }
    args.push("-b:v", opts.vb ? `${opts.vb}k` : "0");
    if (opts.quality != null) {
      if (opts.quality === 0) {
        // Slightly different than "-crf 0".
        args.push("-lossless", "1");
      } else {
        args.push("-crf", opts.quality.toString());
      }
    }
    // In case default will change.
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
    // Scaling must be done once, after crop.
    if (opts.fixSAR || opts.scalew != null || opts.scaleh != null) {
      scale.push(opts._finalw);
      scale.push(opts._finalh);
      vfilters.push(`scale=${scale.join(":")}`);
      if (opts.fixSAR) {
        vfilters.push("setsar=1");
      }
    }
    if (opts.burnSubs) {
      // Workaround for <https://trac.ffmpeg.org/ticket/2067>.
      if (opts._start) {
        vfilters.push(`setpts=PTS+${opts._start}/TB`);
      }
      const subpath = opts.extSubPath || opts.inpath;
      subtitles.push(this._escapeFilterArg(this._escapeFilename(subpath)));
      if (!opts.extSubPath) {
        subtitles.push(`si=${opts.strackn}`);
      }
      vfilters.push(`subtitles=${subtitles.join(":")}`);
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

    // Audio.
    if (opts.hasAudio) {
      if (opts.acodec === "opus") {
        args.push("-c:a", "libopus");
        args.push("-b:a", `${opts.ab}k`);
      } else if (opts.acodec === "vorbis") {
        args.push("-c:a", "libvorbis");
        args.push("-q:a", opts.ab.toString());
      } else if (opts.acodec === "copy") {
        args.push("-c:a", "copy");
      } else {
        assert(false);
      }
    }

    // Audio effects.
    if (opts.hasAudio && opts.acodec !== "copy") {
      if (opts.atrack.channels > 2) {
        args.push("-ac", "2");
      }
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

    return args.join(" ");
  },
  _getCommonArgs(baseArgs = []) {
    return ["-hide_banner", "-nostdin", "-y"].concat(baseArgs);
  },
  getTestArgs({baseArgs, outpath}) {
    const args = this._getCommonArgs(baseArgs);
    fixOpt(args, "-c:v", "libx264");
    fixOpt(args, "-crf", "18", {add: true});
    // x264 doesn't support odd dimensions.
    fixOpt(args, "-vf", (vf) => {
      vf = vf ? vf + "," : "";
      return vf + "scale=floor((iw+1)/2)*2:-2";
    }, {add: true});
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
    args.push("-f", "matroska", this._escapeFilename(outpath));
    return args;
  },
  getEncodeArgs({baseArgs, passlog, passn, title, outpath}) {
    const args = this._getCommonArgs(baseArgs);
    if (passn === 1) {
      // <http://wiki.webmproject.org/ffmpeg/vp9-encoding-guide>.
      fixOpt(args, "-speed", "4");
      // Path passed to ffmpeg should be without suffix.
      // We always have single output stream so caller should reserve
      // only path with suffix "-0.log".
      passlog = passlog.slice(0, -6);
      // Passlog shouldn't be escaped as filename:
      // "-passlogfile file:test" will create "file:test-0.log".
      // Seems to be ffmpeg's inconsistency.
      args.push("-an", "-pass", "1", "-passlogfile", passlog);
      args.push("-f", "null", "-");
    } else if (passn === 2) {
      passlog = passlog.slice(0, -6);
      args.push("-pass", "2", "-passlogfile", passlog);
      args.push("-metadata", `title=${title}`);
      args.push("-f", "webm", this._escapeFilename(outpath));
    } else if (passn === 0) {
      args.push("-metadata", `title=${title}`);
      args.push("-f", "webm", this._escapeFilename(outpath));
    } else {
      assert(false);
    }
    return args;
  },
  getPreviewArgs({inpath, time, vcodec, outpath}) {
    const args = this._getCommonArgs();
    if (time != null) {
      args.push("-ss", time.toString());
    }
    // FIXME(Kagami): Scale to target resolution.
    args.push(
      "-i", this._escapeFilename(inpath),
      "-c:v", vcodec, "-b:v", "0", "-crf", "30",
      "-r", "25",
      // Let FFmpeg auto-select video track.
      "-an", "-sn", "-dn",
      "-frames:v", "1",
      "-pix_fmt", "yuv420p",
      "-f", "webm", this._escapeFilename(outpath)
    );
    return args;
  },
  writeConcat({inpath, prevpath, outpath}) {
    fs.writeFileSync(outpath, [
      this._escapeConcatArg(prevpath),
      this._escapeConcatArg(inpath),
    ].join("\n"));
  },
  getConcatArgs({inpath, listpath, outpath}) {
    const args = this._getCommonArgs();
    args.push(
      "-f", "concat", "-safe", "0", "-i", this._escapeFilename(listpath),
      "-itsoffset", "0.04", "-i", this._escapeFilename(inpath),
      "-map", "0:v:0", "-map", "1:a:0?",
      "-c", "copy",
      "-f", "webm", this._escapeFilename(outpath)
    );
    return args;
  },
});
