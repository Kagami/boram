/**
 * Encoder component.
 * @module boram/encoder
 */

import assert from "assert";
import cx from "classnames";
import React from "react";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {Pane, Tabs, Tab} from "../theme";
import Player from "../player";
import Info from "./info";
import VideoFX from "./video-fx";
import AudioFX from "./audio-fx";
import Codecs from "./codecs";
import Encode from "./encode";
import {parseTime, showTime} from "../util";

const DEFAULT_LIMIT = 19;
const DEFAULT_BITRATE = 5000;
const DEFAULT_Q = 25;
const DEFAULT_OPUS_BITRATE = 128;
const DEFAULT_VORBIS_Q = 4;
const MIN_VP8_Q = 4;
const MAX_VP8_Q = 63;
const MIN_VP9_Q = 0;
const MAX_VP9_Q = 63;
const MIN_OPUS_BITRATE = 6;
const MAX_OPUS_BITRATE = 510;
const MIN_VORBIS_Q = -1;
const MAX_VORBIS_Q = 10;
const SMALL_HD_BITRATE = 2000;
const BIG_HD_BITRATE = 5000;
const SMALL_FHD_BITRATE = 4000;
const BIG_FHD_BITRATE = 10000;
const SMALL_OTHER_BITRATE = 1000;
const BIG_OTHER_BITRATE = 20000;

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
    "& > div": {
      height: "35px !important",
    },
  },
  activeTab: {
    color: "#999 !important",
    backgroundColor: "#eee !important",
  },
  disabledTab: {
    cursor: "not-allowed !important",
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
    // Shouldn't be falsy because of Tabs component restrictions.
    tabIndex: 1,
    encoding: false,
    focused: null,
    allValid: true,
    warnings: {},
    errors: {},
    mstart: 0,
    mend: this.getFullDuration(),
    vtrackn: 0,
    deinterlace: false,
    crop: null,
    burnSubs: false,
    strackn: this.getSubTracks().length ? 0 : null,
    extSubPath: null,
    hasAudio: !!this.getAudioTracks().length,
    atrackn: this.getAudioTracks().length ? 0 : null,
    vcodec: "vp9",
    acodec: "opus",
    mode2Pass: true,
    modeLimit: true,
    modeCRF: this.isShortClip(),
    rawArgs: "",
  }
  componentDidMount() {
    this.handleAll();
  }

  getFullDuration() {
    return parseFloat(this.props.info.format.duration);
  }
  getVideoTracks() {
    return this.props.info.streams.filter(t =>
      t.codec_type === "video" && !t.disposition.attached_pic
    );
  }
  getAudioTracks() {
    return this.props.info.streams.filter(t => t.codec_type === "audio");
  }
  getSubTracks() {
    return this.props.info.streams.filter(t => t.codec_type === "subtitle");
  }
  getFinalWidth({vtrackn, scalew, scaleh, cropw}) {
    const {width, height} = this.getVideoTracks()[vtrackn];
    if (scalew) {
      return scalew;
    } else if (scaleh) {
      return Math.floor(width * scaleh / height);
    } else if (cropw) {
      return cropw;
    } else {
      return width;
    }
  }
  getFinalHeight({vtrackn, scalew, scaleh, croph}) {
    const {width, height} = this.getVideoTracks()[vtrackn];
    if (scaleh) {
      return scaleh;
    } else if (scalew) {
      return Math.floor(height * scalew / width);
    } else if (croph) {
      return croph;
    } else {
      return height;
    }
  }
  getMaxSide(opts) {
    return Math.max(this.getFinalWidth(opts), this.getFinalHeight(opts));
  }
  // Heuristics below are up to further tuninig.
  isShortClip(opts = null) {
    const duration = opts ? opts._duration : this.getFullDuration();
    return duration < 6;
  }
  isSmallBitrate(opts) {
    const vb = FFmpeg.getVideoBitrate(opts);
    const size = this.getMaxSide(opts);
    return (
      (size >= 1920 && vb < SMALL_FHD_BITRATE) ||
      (size >= 1280 && vb < SMALL_HD_BITRATE) ||
      vb < SMALL_OTHER_BITRATE
    );
  }
  isBigBitrate(opts) {
    const vb = FFmpeg.getVideoBitrate(opts);
    const size = this.getMaxSide(opts);
    return (
      (size <= 1280 && vb > BIG_HD_BITRATE) ||
      (size <= 1920 && vb > BIG_FHD_BITRATE) ||
      vb > BIG_OTHER_BITRATE
    );
  }

  makeFocuser = (name) => {
    return () => {
      this.setState({focused: name});
    };
  };
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
    let {mend} = this.state;
    if (mstart >= mend) {
      mend = this.getFullDuration();
    }
    const upd = {mstart, mend};
    this.setState(upd);
    this.handleAll(upd, {marked: "both"});
  };
  handleMarkEnd = (mend) => {
    let {mstart} = this.state;
    if (mstart >= mend) {
      mstart = 0;
    }
    const upd = {mstart, mend};
    this.setState(upd);
    this.handleAll(upd, {marked: "both"});
  };
  handleResetFragment = () => {
    const mstart = 0;
    const mend = this.getFullDuration();
    const upd = {mstart, mend};
    this.setState(upd);
    this.handleAll(upd, {marked: "both"});
  };
  handleMPVDeinterlace = (deinterlace) => {
    // Not a user interaction.
    this.setState({deinterlace}, this.handleAll);
  };
  handleCrop = (crop) => {
    this.handleAll(null, {crop});
  };
  handleMPVSubTrack = (strackn) => {
    this.setState({strackn}, this.handleAll);
  };
  handleSubLoad = (extSubPath) => {
    const strackn = this.getSubTracks().length;
    const upd = {strackn, extSubPath, burnSubs: true};
    this.setState(upd);
    this.handleAll(upd);
    this.refs.player.setSub({strackn, extSubPath});
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
    const warnings = {
      codecs: [],
    };
    const errors = {
      videoFX: [],
      audioFX: [],
      codecs: [],
    };
    function warn(tab, message) {
      warnings[tab].push(message);
    }
    function requireInt(value) {
      value = value.toString();
      if (!/^-?\d+$/.test(value)) throw new Error("int required");
      return parseInt(value, 10);
    }
    function requireFloat(value) {
      value = value.toString();
      if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error("float required");
      return parseFloat(value);
    }
    function requireRange(value, min, max = Infinity) {
      if (value < min || value > max) throw new Error("bad range");
      return value;
    }
    const validate = (tab, name, value, validator) => {
      try {
        return validator(value);
      } catch ({message}) {
        allValid = false;
        errors[tab].push({name, message});
        return null;
      }
    };

    if (what.crop) {
      // Always receive all 4 values.
      setText("videoFX", "cropw", what.crop.cropw);
      setText("videoFX", "croph", what.crop.croph);
      setText("videoFX", "cropx", what.crop.cropx);
      setText("videoFX", "cropy", what.crop.cropy);
    }

    // NOTE(Kagami): We use getValue/setValue instead of value/setState
    // in inputs fields because we should avoid any slowdowns at all
    // costs: unresponsive controls kill user experience. However we
    // may try to use onChange instead of onBlur or profile other
    // methods.
    // vfx.
    const vtrackn = get("vtrackn");
    const deinterlace = get("deinterlace");
    let cropw = getText("videoFX", "cropw");
    let croph = getText("videoFX", "croph");
    let cropx = getText("videoFX", "cropx");
    let cropy = getText("videoFX", "cropy");
    let scalew = getText("videoFX", "scalew");
    let scaleh = getText("videoFX", "scaleh");
    let speed = ""; //getText("videoFX", "speed");
    let fps = ""; //getText("videoFX", "fps");
    const burnSubs = get("burnSubs");
    const strackn = get("strackn");
    let extSubPath = get("extSubPath");
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
    let quality = getText("codecs", "quality");
    const acodec = get("acodec");
    let ab = getText("codecs", "ab");
    const mode2Pass = get("mode2Pass");
    const modeLimit = get("modeLimit");
    const modeCRF = get("modeCRF");
    let rawArgs = "";
    // Helpers.
    const inpath = this.props.source.path;
    const atracks = this.getAudioTracks();
    const mstart = get("mstart");
    const mend = get("mend");
    const induration = this.getFullDuration();
    const useExtSub = strackn === this.getSubTracks().length;
    // Will contain exact values.
    let _start = null;
    let _duration = null;

    // Validate & transform.
    // Validation is poor and doesn't allow expressions, but user can
    // always edit raw arguments. So this is sort of "basic mode".
    cropw = validate("videoFX", "cropw", cropw, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1);
    });
    croph = validate("videoFX", "croph", croph, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1);
    });
    cropx = validate("videoFX", "cropx", cropx, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 0);
    });
    cropy = validate("videoFX", "cropy", cropy, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 0);
    });
    scalew = validate("videoFX", "scalew", scalew, v => {
      if (!v) return null;
      // Scale parameters can contain arbitrary expressions and `-1` but
      // we validate them as Nat numbers for simplicity.
      v = requireInt(v);
      return requireRange(v, 1);
    });
    scaleh = validate("videoFX", "scaleh", scaleh, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1);
    });
    extSubPath = useExtSub ? extSubPath : null;
    speed = validate("videoFX", "speed", speed, v => {
      if (!v) return null;
      v = requireFloat(v);
      // XXX(Kagami): 0.001 is a hack to emulate `> 0` because
      // `requireRange` checks for `>=`. Fix this?
      return requireRange(v, 0.001);
    });
    // TODO(Kagami): accept "num/den" form and abbreviations?
    fps = validate("videoFX", "fps", fps, v => {
      if (!v) return null;
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    fadeIn = validate("audioFX", "fadeIn", fadeIn, v => {
      if (!v) return null;
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    fadeOut = validate("audioFX", "fadeOut", fadeOut, v => {
      if (!v) return null;
      v = requireFloat(v);
      return requireRange(v, 0.001);
    });
    amplify = validate("audioFX", "amplify", amplify, v => {
      if (!v) return null;
      v = requireInt(v);
      return requireRange(v, 1, 64);
    });
    if (what.marked === "mstart" || what.marked === "both") {
      start = mstart ? showTime(mstart) : "";
      setText("codecs", "start", start);
    }
    start = start || null;
    _start = validate("codecs", "start", start, (v) => {
      if (!v) return 0;
      v = parseTime(v);
      return requireRange(v, 0, induration - 0.001);
    });
    if (what.marked === "mend" || what.marked === "both") {
      end = mend > induration - 0.001 ? "" : showTime(mend);
      setText("codecs", "end", end);
    }
    end = end || null;
    _duration = validate("codecs", "end", end, (v) => {
      if (!allValid) return null;
      if (!v) return induration - _start;
      v = parseTime(v);
      v = requireRange(v, 0.001, induration);
      v -= _start;
      if (v <= 0) throw new Error("less than start");
      return v;
    });
    if (what.checked === "modeCRF") {
      limit = modeCRF ? "0" : "";
      setText("codecs", "limit", limit);
    }
    limit = validate("codecs", "limit", limit, v => {
      if (modeCRF) return 0;
      v = v || (modeLimit ? DEFAULT_LIMIT : DEFAULT_BITRATE);
      v = requireFloat(v);
      return requireRange(v, modeLimit ? 0.001 : 1);
    });
    quality = validate("codecs", "quality", quality, v => {
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
    ab = validate("codecs", "ab", ab, v => {
      v = v || (acodec === "opus" ? DEFAULT_OPUS_BITRATE : DEFAULT_VORBIS_Q);
      if (acodec === "opus") {
        v = requireFloat(v);
        return requireRange(v, MIN_OPUS_BITRATE, MAX_OPUS_BITRATE);
      } else if (acodec === "vorbis") {
        v = requireInt(v);
        return requireRange(v, MIN_VORBIS_Q, MAX_VORBIS_Q);
      } else {
        assert(false);
      }
    });
    if (what.checked === "deinterlace") {
      this.refs.player.setDeinterlace(deinterlace);
    }
    if (what.selected === "strackn") {
      this.refs.player.setSub({strackn});
    }
    // This assumes we were called from `onBlur` handler.
    // This clears warnings if errors are present.
    this.setState({allValid, warnings, errors, rawArgs, focused: null});
    if (!allValid) {
      setText("codecs", "rawArgs", rawArgs);
      return;
    }

    const opts = {
      // vfx.
      vtrackn,
      deinterlace,
      cropw, croph, cropx, cropy,
      scalew, scaleh,
      speed, fps,
      burnSubs, strackn, extSubPath,
      // afx.
      hasAudio, atrackn,
      fadeIn, fadeOut,
      amplify,
      // codecs.
      start, end,
      vcodec, limit, quality,
      acodec, ab,
      mode2Pass, modeLimit, modeCRF,
      // helpers.
      inpath, atracks,
      _start, _duration,
    };
    if (!modeCRF) {
      if (this.isShortClip(opts)) {
        warn("codecs", `Consider CRF mode for such short fragment`);
      }
      if (this.isSmallBitrate(opts)) {
        warn("codecs", `Video bitrate seems too small,
                        consider fixing limit`);
      } else if (this.isBigBitrate(opts)) {
        warn("codecs", `Video bitrate seems too big,
                        consider CRF mode or fix limit`);
      }
      if (this.isSmallBitrate(opts) || this.isBigBitrate(opts)) {
        const vb = FFmpeg.getVideoBitrate(opts);
        warn("codecs", `Recommended bitrates:
                        ${SMALL_HD_BITRATE}÷${BIG_HD_BITRATE} (hd),
                        ${SMALL_FHD_BITRATE}÷${BIG_FHD_BITRATE} (fhd),
                        ${SMALL_OTHER_BITRATE}÷${BIG_OTHER_BITRATE} (other);
                        current: ${vb} kbps`);
      }
    }
    rawArgs = FFmpeg.getRawArgs(opts).join(" ");
    setText("codecs", "rawArgs", rawArgs);
    this.setState({
      _duration,
      warnings,
      rawArgs,
      mstart: _start,
      mend: _start + _duration,
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
    if (this.state.encoding) return;
    this.setState({tabIndex});
    this.refs.encode.clearState();
  };
  getTabNode(label, index, children) {
    const {classes} = this.sheet;
    const active = this.state.tabIndex === index;
    const disabled = this.state.encoding && !active;
    return (
      <Tab
        value={index}
        label={label}
        disableTouchRipple
        className={cx({
          [classes.tab]: true,
          [classes.activeTab]: active,
          [classes.disabledTab]: disabled,
        })}
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
          atracks={this.getAudioTracks()}
          mstart={this.state.mstart}
          mend={this.state.mend}
          crop={this.state.crop}
          onMarkStart={this.handleMarkStart}
          onMarkEnd={this.handleMarkEnd}
          onDeinterlace={this.handleMPVDeinterlace}
          onCrop={this.handleCrop}
          onSubTrack={this.handleMPVSubTrack}
        />
        <Tabs
          value={this.state.tabIndex}
          onChange={this.handleSelect}
          className={classes.tabs}
          inkBarStyle={{display: "none"}}
          contentContainerClassName={classes.tabContent}
          tabTemplate={this.getTabTemplate}
        >
          {this.getTabNode("info", 1,
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
          {this.getTabNode("video fx", 2,
            <VideoFX
              ref="videoFX"
              makeFocuser={this.makeFocuser}
              makeChecker={this.makeChecker}
              makeSelecter={this.makeSelecter}
              source={this.props.source}
              mstart={this.state.mstart}
              focused={this.state.focused}
              encoding={this.state.encoding}
              errors={this.state.errors.videoFX}
              vtracks={this.getVideoTracks()}
              stracks={this.getSubTracks()}
              vtrackn={this.state.vtrackn}
              deinterlace={this.state.deinterlace}
              burnSubs={this.state.burnSubs}
              strackn={this.state.strackn}
              extSubPath={this.state.extSubPath}
              onUpdate={this.handleAll}
              onSubLoad={this.handleSubLoad}
              onEncoding={this.handleEncodingState}
            />
          )}
          {this.getTabNode("audio fx", 3,
            <AudioFX
              ref="audioFX"
              makeFocuser={this.makeFocuser}
              makeChecker={this.makeChecker}
              makeSelecter={this.makeSelecter}
              focused={this.state.focused}
              errors={this.state.errors.audioFX}
              atracks={this.getAudioTracks()}
              hasAudio={this.state.hasAudio}
              atrackn={this.state.atrackn}
              onUpdate={this.handleAll}
            />
          )}
          {this.getTabNode("codecs", 4,
            <Codecs
              ref="codecs"
              makeFocuser={this.makeFocuser}
              makeChecker={this.makeChecker}
              makeSelecter={this.makeSelecter}
              focused={this.state.focused}
              warnings={this.state.warnings.codecs}
              errors={this.state.errors.codecs}
              _duration={this.state._duration}
              vcodec={this.state.vcodec}
              hasAudio={this.state.hasAudio}
              acodec={this.state.acodec}
              mode2Pass={this.state.mode2Pass}
              modeLimit={this.state.modeLimit}
              modeCRF={this.state.modeCRF}
              onUpdate={this.handleAll}
              onRawArgs={this.handleRawArgs}
              onResetFragment={this.handleResetFragment}
            />
          )}
          {this.getTabNode("encode", 5,
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
              onProgress={this.props.onProgress}
            />
          )}
        </Tabs>
      </Pane>
    );
  }
}
