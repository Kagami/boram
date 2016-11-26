/**
 * Encoder component.
 * @module boram/encoder
 */

import assert from "assert";
import React from "react";
import cx from "classnames";
import {useSheet} from "../jss";
import {Pane, Tabs, Tab} from "../theme";
import Player from "../player";
import Info from "./info";
import VideoFX from "./video-fx";
import AudioFX from "./audio-fx";
import Codecs from "./codecs";
import Encode from "./encode";
import {parseTime, showTime} from "../util";

const DEFAULT_LIMIT = 8;
const DEFAULT_BITRATE = 1000;
const DEFAULT_Q = 25;
const DEFAULT_OPUS_BITRATE = 128;
const DEFAULT_VORBIS_Q = 4;
const MIN_VP8_Q = 4;
const MAX_VP8_Q = 63;
const MIN_VP9_Q = 0;
const MAX_VP9_Q = 63;
const MIN_VORBIS_Q = -1;
const MAX_VORBIS_Q = 10;

@useSheet({
  tabs: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  tab: {
    color: "#fff !important",
    backgroundColor: "#ccc !important",
    cursor: "auto !important",
    WebkitUserSelect: "none",
    "& > div > div": {
      height: "35px !important",
    },
  },
  activeTab: {
    color: "#999 !important",
    backgroundColor: "#eee !important",
  },
  tabContent: {
    flex: 1,
    height: 0,
    boxSizing: "border-box",
    padding: 10,
  },
})
export default class extends React.PureComponent {
  static styles = {
    item1: {
      flex: 1,
      // Workaround window shrink issue.
      minHeight: 0,
    },
  }
  state = {
    tabIndex: 0,
    encoding: false,
    allValid: true,
    mstart: 0,
    mend: 0,
    vtrackn: 0,
    deinterlace: false,
    burnSubs: false,
    strackn: this.getSubTracks().length ? 0 : null,
    hasAudio: !!this.getAudioTracks().length,
    atrackn: this.getAudioTracks().length ? 0 : null,
    vcodec: "vp9",
    acodec: "opus",
    mode2Pass: true,
    modeLimit: true,
    modeCRF: false,
    rawArgs: "",
  }
  componentDidMount() {
    this.handleAll();
  }

  getVideoTracks() {
    return this.props.info.streams.filter(t => t.codec_type === "video");
  }
  getAudioTracks() {
    return this.props.info.streams.filter(t => t.codec_type === "audio");
  }
  getSubTracks() {
    return this.props.info.streams.filter(t => t.codec_type === "subtitle");
  }
  getVorbisBitrate(vorbisq) {
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
  }
  calcVideoBitrate({limit, _duration, acodec, ab}) {
    if (acodec === "vorbis") {
      ab = this.getVorbisBitrate(ab);
    }
    const limitKbits = limit * 8 * 1024;
    const vb = Math.floor(limitKbits / _duration - ab);
    return vb > 0 ? vb : 1;
  }
  /**
   * Escape shell argument.
   */
  escapeArg(arg) {
    arg = arg.replace(/\\/g, "\\\\");
    arg = arg.replace(/"/g, '\\"');
    arg = arg.replace(/\$/g, "\\$");
    return `"${arg}"`;
  }
  /**
   * (Taken from webm.py)
   *
   * Escape FFmpeg filter argument (see ffmpeg-filters(1), "Notes on
   * filtergraph escaping"). Escaping rules are rather mad.
   *
   * Known issues: names like :.ass, 1:.ass still don't work. Seems like
   * a bug in FFmpeg because _:.ass works ok.
   */
  escapeFFArg(arg) {
    arg = arg.replace(/\\/g, "\\\\");      // \ -> \\
    arg = arg.replace(/'/g, "'\\\\\\''");  // ' -> '\\\''
    arg = arg.replace(/:/g, "\\:");        // : -> \:
    return `'${arg}'`;
  }
  makeRawArgs(opts) {
    const args = [];
    const scale = [];
    const crop = [];
    const vfilters = [];
    const afilters = [];
    const inpath = this.props.source.path;
    const vb = (opts.modeLimit && !opts.modeCRF)
      ? this.calcVideoBitrate(opts)
      : opts.limit;
    function maybeSet(name, value) {
      if (value != null) {
        args.push(name, value.toString());
      }
    }

    // Input.
    maybeSet("-ss", opts.start);
    args.push("-i", this.escapeArg(inpath));
    if (opts.end != null) {
      // We always use `-t` in resulting command because `-ss` before
      // `-i` resets timestamps, see:
      // <https://trac.ffmpeg.org/wiki/Seeking#Notes>.
      args.push("-t", opts._duration.toFixed(3));
    }

    // Streams.
    args.push("-map", `0:v:${opts.vtrackn}`);
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
      // VP8 is fast enough to use -speed=0 for both passes.
      // TODO(Kagami): Auto-insert colormatrix conversion?
      // TODO(Kagami): Slices?
      args.push("-c:v", "libvpx", "-speed", "0");
    } else {
      assert(false);
    }
    args.push("-b:v", vb ? `${vb}k` : "0");
    maybeSet("-crf", opts.crf);
    // Enabled for VP9 by default but always force it just in case.
    args.push("-auto-alt-ref", "1", "-lag-in-frames", "25");
    // Default to 128 for both VP8 and VP9 but bigger keyframe interval
    // saves bitrate a bit.
    args.push("-g", "9999");
    // Using other subsamplings require profile>0 which support
    // across various decoders is still poor.
    args.push("-pix_fmt", "yuv420p");

    // Video filters.
    // Deinterlacing must be always first.
    if (opts.deinterlace) {
      vfilters.push("yadif");
    }
    // Both values must be set if any is specified.
    // TODO(Kagami): clear SAR?
    if (opts.scalew != null || opts.scaleh != null) {
      scale.push(opts.scalew == null ? -1 : opts.scalew);
      scale.push(opts.scaleh == null ? -1 : opts.scaleh);
      vfilters.push(`scale=${scale.join(":")}`);
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
    if (opts.burnSubs) {
      // Workaround for <https://trac.ffmpeg.org/ticket/2067>.
      if (opts._start) {
        vfilters.push(`setpts=PTS+${opts._start}/TB`);
      }
      // TODO(Kagami): External track.
      vfilters.push(`subtitles=${this.escapeFFArg(inpath)}:si=${opts.strackn}`);
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
      args.push("-vf", `"${vfilters.join(",")}"`);
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
      args.push("-ac", "2");

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
  }

  makeChecker = (name) => {
    return (e, checked) => {
      const upd = {[name]: checked};
      this.setState(upd);
      // State would be updated only on next tick so provide also
      // changed component right away.
      this.handleAll(upd, {checked: name});
    };
  };
  makeSelecter = (name) => {
    return (e, _, value) => {
      const upd = {[name]: value};
      this.setState(upd);
      this.handleAll(upd, {selected: name});
    };
  };
  handleMarkStart = (mstart) => {
    const upd = {mstart};
    this.setState(upd);
    this.handleAll(upd, {marked: "mstart"});
  };
  handleMarkEnd = (mend) => {
    const upd = {mend};
    this.setState(upd);
    this.handleAll(upd, {marked: "mend"});
  };
  handleAll = (upd, what = {}) => {
    const nextState = Object.assign({}, this.state, upd);
    const get = (name) => {
      return nextState[name];
    };
    const ref = (tab, name) => {
      return this.refs[tab].refs[name];
    };
    function getText(tab, name) {
      return ref(tab, name).getValue();
    }
    function setText(tab, name, value) {
      return ref(tab, name).setValue(value);
    }

    let allValid = true;
    function requireInt(value) {
      value = value.toString();
      if (!/^-?\d+$/.test(value)) {
        throw new Error("Int required");
      }
      return parseInt(value, 10);
    }
    function requireFloat(value) {
      value = value.toString();
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        throw new Error("Float required");
      }
      return parseFloat(value);
    }
    function requireRange(value, min, max = Infinity) {
      if (value < min || value > max) {
        throw new Error("Bad range");
      }
      return value;
    }
    const validate = (value, validator) => {
      try {
        return validator(value);
      } catch (e) {
        // FIXME(Kagami): Accumulate errors.
        allValid = false;
        return null;
      }
    };

    // NOTE(Kagami): We use getValue/setValue instead of value/setState
    // in inputs fields because we should avoid any slowdowns at all
    // costs: unresponsive controls kill user experience. However we
    // may try to use onChange instead of onBlur or profile other
    // methods.
    // vfx.
    const vtrackn = get("vtrackn");
    const deinterlace = get("deinterlace");
    let scalew = getText("videoFX", "scalew");
    let scaleh = getText("videoFX", "scaleh");
    let cropw = getText("videoFX", "cropw");
    let croph = getText("videoFX", "croph");
    let cropx = getText("videoFX", "cropx");
    let cropy = getText("videoFX", "cropy");
    let speed = ""; //getText("videoFX", "speed");
    let fps = ""; //getText("videoFX", "fps");
    const burnSubs = get("burnSubs");
    const strackn = get("strackn");
    // afx.
    const hasAudio = get("hasAudio");
    const atrackn = get("atrackn");
    let fadeIn = getText("audioFX", "fadeIn");
    let fadeOut = getText("audioFX", "fadeOut");
    let amplify = getText("audioFX", "amplify");
    // codecs.
    let start = getText("codecs", "start");
    let end = getText("codecs", "end");
    const vcodec = get("vcodec");
    let limit = getText("codecs", "limit");
    let crf = getText("codecs", "crf");
    const acodec = get("acodec");
    let ab = getText("codecs", "ab");
    const mode2Pass = get("mode2Pass");
    const modeLimit = get("modeLimit");
    const modeCRF = get("modeCRF");
    // Helpers.
    const mstart = get("mstart");
    const mend = get("mend");
    const induration = parseFloat(this.props.info.format.duration);
    // Will contain exact values.
    let _start = null;
    let _duration = null;

    // Validate & transform.
    scalew = validate(scalew, v => {
      if (!v) return null;
      // Scale parameters can contain arbitrary expressions and `-1` but
      // we validate them as nat numbers for simplicity.
      v = requireInt(v);
      return requireRange(v, 1);
    });
    scaleh = validate(scaleh, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1);
    });
    // Validation is poor and doesn't allow expressions, but user can
    // always edit raw arguments. So this is sort of "basic mode".
    cropw = validate(cropw, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1);
    });
    croph = validate(croph, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1);
    });
    cropx = validate(cropx, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 0);
    });
    cropy = validate(cropy, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 0);
    });
    speed = validate(speed, v => {
      if (!v) return null;
      v = requireFloat(v);
      // XXX(Kagami): 0.001 is a hack to emulate `> 0` because
      // `requireRange` checks for `>=`. Fix this?
      return requireRange(v, 0.001);
    });
    // TODO(Kagami): accept "num/den" form and abbreviations?
    fps = validate(fps, v => {
      if (!v) return null;
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    fadeIn = validate(fadeIn, v => {
      if (!v) return null;
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    fadeOut = validate(fadeOut, v => {
      if (!v) return null;
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    amplify = validate(amplify, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1, 64);
    });
    if (what.marked === "mstart") {
      start = mstart ? showTime(mstart) : "";
      setText("codecs", "start", start);
    }
    start = start || null;
    _start = validate(start, (v) => {
      if (!v) return 0;
      v = parseTime(v);
      return requireRange(v, 0, induration - 0.001);
    });
    if (what.marked === "mend") {
      end = mend > induration - 0.001 ? "" : showTime(mend);
      setText("codecs", "end", end);
    }
    end = end || null;
    _duration = validate(end, (v) => {
      if (!allValid) return null;
      if (!v) return induration - _start;
      v = parseTime(v);
      v = requireRange(v, 0.001, induration);
      v -= _start;
      if (v <= 0) {
        throw new Error("Less than start");
      }
      return v;
    });
    if (what.checked === "modeCRF") {
      limit = modeCRF ? "0" : "";
      setText("codecs", "limit", limit);
    }
    limit = validate(limit, v => {
      if (modeCRF) return 0;
      v = v || (modeLimit ? DEFAULT_LIMIT : DEFAULT_BITRATE);
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    crf = validate(crf, v => {
      if (modeCRF) {
        v = v || DEFAULT_Q;
      } else if (!v) {
        return null;
      }
      v = requireInt(v);
      if (vcodec === "vp9") {
        return requireRange(v, MIN_VP9_Q, MAX_VP9_Q);
      } else if (vcodec === "vp8") {
        return requireRange(v, MIN_VP8_Q, MAX_VP8_Q);
      } else {
        assert(false);
      }
    });
    if (what.selected === "acodec") {
      ab = "";
      setText("codecs", "ab", ab);
    }
    ab = validate(ab, v => {
      v = v || (acodec === "opus" ? DEFAULT_OPUS_BITRATE : DEFAULT_VORBIS_Q);
      if (acodec === "opus") {
        v = requireFloat(v);
        return requireRange(v, 0.001);
      } else if (acodec === "vorbis") {
        v = requireInt(v);
        return requireRange(v, MIN_VORBIS_Q, MAX_VORBIS_Q);
      } else {
        assert(false);
      }
    });
    this.setState({allValid});
    if (!allValid) return;

    const opts = {
      // vfx.
      vtrackn,
      deinterlace,
      scalew, scaleh,
      cropw, croph, cropx, cropy,
      speed, fps,
      burnSubs, strackn,
      // afx.
      hasAudio, atrackn,
      fadeIn, fadeOut,
      amplify,
      // codecs.
      start, end, _start, _duration,
      vcodec, limit, crf,
      acodec, ab,
      mode2Pass, modeLimit, modeCRF,
    };
    const rawArgs = this.makeRawArgs(opts).join(" ");
    setText("codecs", "rawArgs", rawArgs);
    this.setState({
      _duration,
      rawArgs,
      mstart: _start,
      mend: _duration < induration ? _start + _duration : 0,
    });
  };
  handleRawArgs = (e) => {
    this.setState({rawArgs: e.target.value});
  };
  handleEncodingState = (encoding) => {
    this.setState({encoding});
    if (encoding) {
      this.refs.player.pause();
    }
  };
  getTabTemplate({children, selected}) {
    const style = {
      // XXX(Kagami): Can't use display property because multiline
      // TextField works badly inside fully hidden divs.
      overflow: selected ? "visible" : "hidden",
      height: selected ? "100%" : 0,
    };
    return <div style={style}>{children}</div>;
  }
  handleSelect = (tabIndex) => {
    this.setState({tabIndex});
  };
  getTabNode(label, index, children) {
    const {classes} = this.sheet;
    const active = this.state.tabIndex === index;
    return (
      <Tab
        value={index}
        label={label}
        className={cx(classes.tab, active && classes.activeTab)}
      >
        {children}
      </Tab>
    );
  }
  render() {
    const {classes} = this.sheet;
    const {styles} = this.constructor;
    return (
      <Pane vertical style1={styles.item1} size2={340}>
        <Player
          ref="player"
          active={this.props.active}
          source={this.props.source}
          format={this.props.info.format}
          vtrack={this.getVideoTracks()[0]}
          mstart={this.state.mstart}
          mend={this.state.mend}
          onMarkStart={this.handleMarkStart}
          onMarkEnd={this.handleMarkEnd}
        />
        <Tabs
          onChange={this.handleSelect}
          className={classes.tabs}
          inkBarStyle={{display: "none"}}
          contentContainerClassName={classes.tabContent}
          tabTemplate={this.getTabTemplate}
        >
          {this.getTabNode("info", 0,
            <Info
              ref="info"
              source={this.props.source}
              format={this.props.info.format}
              vtracks={this.getVideoTracks()}
              atracks={this.getAudioTracks()}
              stracks={this.getSubTracks()}
              onUpdate={this.handleAll}
            />
          )}
          {this.getTabNode("video fx", 1,
            <VideoFX
              ref="videoFX"
              makeChecker={this.makeChecker}
              makeSelecter={this.makeSelecter}
              vtracks={this.getVideoTracks()}
              stracks={this.getSubTracks()}
              vtrackn={this.state.vtrackn}
              deinterlace={this.state.deinterlace}
              burnSubs={this.state.burnSubs}
              strackn={this.state.strackn}
              onUpdate={this.handleAll}
            />
          )}
          {this.getTabNode("audio fx", 2,
            <AudioFX
              ref="audioFX"
              makeChecker={this.makeChecker}
              makeSelecter={this.makeSelecter}
              atracks={this.getAudioTracks()}
              hasAudio={this.state.hasAudio}
              atrackn={this.state.atrackn}
              onUpdate={this.handleAll}
            />
          )}
          {this.getTabNode("codecs", 3,
            <Codecs
              ref="codecs"
              makeChecker={this.makeChecker}
              makeSelecter={this.makeSelecter}
              vcodec={this.state.vcodec}
              hasAudio={this.state.hasAudio}
              acodec={this.state.acodec}
              mode2Pass={this.state.mode2Pass}
              modeLimit={this.state.modeLimit}
              modeCRF={this.state.modeCRF}
              onUpdate={this.handleAll}
              onRawArgs={this.handleRawArgs}
            />
          )}
          {this.getTabNode("encode", 4,
            <Encode
              ref="encode"
              events={this.props.events}
              source={this.props.source}
              encoding={this.state.encoding}
              allValid={this.state.allValid}
              _duration={this.state._duration}
              vtrack={this.getVideoTracks()[this.state.vtrackn]}
              mode2Pass={this.state.mode2Pass}
              rawArgs={this.state.rawArgs}
              onEncoding={this.handleEncodingState}
            />
          )}
        </Tabs>
      </Pane>
    );
  }
}
