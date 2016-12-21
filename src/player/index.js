/**
 * Enhanced video element.
 * @module boram/player
 */

import React from "react";
import cx from "classnames";
import {useSheet} from "../jss";
import {Icon} from "../theme";
import MPV from "../mpv";
import {parseTime, showTime, parseSAR, tryRun} from "../util";

@useSheet({
  player: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
  },
  playerInner: {
    position: "relative",
    flex: 1,
    minHeight: 0,
  },
})
export default class extends React.PureComponent {
  state = {pause: true, time: 0, volume: 100, mute: false, fullscreen: false};
  componentWillMount() {
    this.setTime(this.state.time);
  }
  componentDidMount() {
    document.addEventListener("keydown", this.handleGlobaKey, false);
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleGlobaKey, false);
  }
  duration = parseFloat(this.props.format.duration);
  // NOTE(Kagami): currentTime/mstart/mend are floats so need
  // small adjustements in order to keep them in sync.
  isAlmostEqual(a, b) {
    return Math.abs(a - b) < 0.001;
  }
  isMarkStartDisabled() {
    return (
      this.isAlmostEqual(this.state.time, this.duration) ||
      this.isAlmostEqual(this.state.time, this.props.mstart)
    );
  }
  isMarkEndDisabled() {
    return (
      this.isAlmostEqual(this.state.time, 0) ||
      this.isAlmostEqual(this.state.time, this.props.mend)
    );
  }
  getSliderMarkEnd() {
    return (!this.props.mstart &&
            this.isAlmostEqual(this.props.mend, this.duration))
      ? 0
      : this.props.mend;
  }
  // Just pass further to mpv module.
  bindMPV(action) {
    return (...args) => {
      return this.refs.mpv[action](...args);
    };
  }
  setDeinterlace = this.bindMPV("setDeinterlace");
  setSub = this.bindMPV("setSub");
  // "Stupid" play/pause actions.
  play = this.bindMPV("play");
  pause = this.bindMPV("pause");
  // "Smart" play/pause action.
  togglePlay = () => {
    const {time} = this.state;
    const mend = this.props.mend || this.duration;
    const action = this.state.pause ? "play" : "pause";
    if (action === "play" &&
        this.state.loopCut &&
        (time < this.props.mstart + 0.001 || time > mend - 0.001)) {
      // We can start playing right away and `handleTime` will handle
      // `loopCut` anyway but that will play out-of-loop video for some
      // period of time.
      this.seek(this.props.mstart);
    } else if (action === "play" && time >= Math.floor(this.duration)) {
      this.seek(0);
    }
    this[action]();
  };
  seek(time) {
    this.refs.mpv.seek(time);
    // We improve UX by changing slider pos immediately.
    this.setState({time});
  }
  // Displayed time info.
  setTime(time) {
    const prettyTime = showTime(time);
    const validTime = true;
    this.setState({prettyTime, validTime});
  }
  toggleLoopCut = () => {
    this.setState({loopCut: !this.state.loopCut});
  };
  toggleFullscreen = () => {
    if (this.state.fullscreen) {
      document.webkitExitFullscreen();
    } else {
      this.refs.mpv.getNode().webkitRequestFullscreen();
    }
    this.setState({fullscreen: !this.state.fullscreen});
  };
  handleGlobaKey = (e) => {
    if (!this.props.active) return;
    e.preventDefault();
    switch (e.key) {
    case "r":
      // mpv uses r/t combination, block "r" too since we use "t".
      break;
    case "t":
      this.refs.time.focus();
      break;
    case "f":
      this.toggleFullscreen();
      break;
    case "Escape":
      if (this.state.fullscreen) this.toggleFullscreen();
      break;
    default:
      this.refs.mpv.sendKey(e);
    }
  };
  handleTimeKey = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    switch (e.key) {
    case "Enter":
      if (this.state.validTime) {
        const time = parseTime(this.state.prettyTime);
        const prettyTime = showTime(time);
        this.setState({prettyTime});
        this.seek(time);
        this.refs.time.blur();
      }
      break;
    case "Escape":
      this.refs.time.blur();
      break;
    }
  };
  handlePlayPause = (pause) => {
    this.setState({pause});
  };
  handleTime = (time) => {
    if (this.seekDragging) return;
    const mend = this.props.mend || this.duration;
    if (!this.state.pause &&
        this.state.loopCut &&
        (time < this.props.mstart + 0.001 || time > mend - 0.001)) {
      this.seek(this.props.mstart);
      return;
    }
    this.setTime(time);
    this.setState({time});
  };
  handleVolume = (upd) => {
    if (this.refs.volume.isDragging()) return;
    let {volume, mute} = Object.assign({}, this.state, upd);
    volume = Math.min(volume, 100);
    this.setState({volume, mute});
  };
  handleVolumeControl = ({volume, mute}) => {
    this.refs.mpv.setVolume({volume, mute});
    this.setState({volume, mute});
  };
  handleEOF = () => {
    this.seek(0);
  };
  handleMarkStart = () => {
    this.props.onMarkStart(this.state.time);
  };
  handleMarkEnd = () => {
    this.props.onMarkEnd(this.state.time);
  };
  handleTimeControl = (e) => {
    const prettyTime = e.target.value;
    const time = tryRun(parseTime, prettyTime);
    const validTime = time != null && time <= this.duration;
    this.setState({prettyTime, validTime});
  };
  handleSeekMouseDown = () => {
    this.seekDragging = true;
  };
  handleSeekControl = (e) => {
    let time = parseFloat(e.target.value);
    time = Math.floor(time * 10) / 10;
    this.setTime(time);
    this.seek(time);
  };
  handleSeekMouseUp = () => {
    this.seekDragging = false;
  };
  handleWheel = (e) => {
    const action = e.deltaY > 0 ? "frameBackStep" : "frameStep";
    this.refs.mpv[action]();
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.player} onWheel={this.handleWheel}>
        <div className={classes.playerInner}>
          <MPV
            ref="mpv"
            src={this.props.source.path}
            onPlayPause={this.handlePlayPause}
            onTime={this.handleTime}
            onVolume={this.handleVolume}
            onEOF={this.handleEOF}
            onDeinterlace={this.props.onDeinterlace}
            onSubTrack={this.props.onSubTrack}
          />
          <CropArea
            vtrack={this.props.vtrack}
            crop={this.props.crop}
            onClick={this.togglePlay}
            onCrop={this.props.onCrop}
          />
        </div>
        <Controls>
          <Control
            icon={this.state.pause ? "play" : "pause"}
            title="Play/pause"
            onClick={this.togglePlay}
          />
          <Control
            icon="scissors"
            title="Mark fragment start"
            disabled={this.isMarkStartDisabled()}
            onClick={this.handleMarkStart}
          />
          <Time
            ref="time"
            value={this.state.prettyTime}
            onChange={this.handleTimeControl}
            onKeyDown={this.handleTimeKey}
            invalid={!this.state.validTime}
          />
          <Control
            flip
            icon="scissors"
            title="Mark fragment end"
            disabled={this.isMarkEndDisabled()}
            onClick={this.handleMarkEnd}
          />
          <Control
            icon="repeat"
            title="Toggle fragment looping"
            onClick={this.toggleLoopCut}
            pressed={this.state.loopCut}
          />
          <Control
            right
            icon="arrows-alt"
            title="Toggle fullscreen"
            onClick={this.toggleFullscreen}
          />
          <Volume
            ref="volume"
            volume={this.state.volume}
            mute={this.state.mute}
            disabled={!this.props.atracks.length}
            onChange={this.handleVolumeControl}
          />
          <Seek
            value={this.state.time}
            max={this.duration}
            mstart={this.props.mstart}
            mend={this.getSliderMarkEnd()}
            onMouseDown={this.handleSeekMouseDown}
            onChange={this.handleSeekControl}
            onMouseUp={this.handleSeekMouseUp}
          />
        </Controls>
      </div>
    );
  }
}

// Player sub-components.

@useSheet({
  outer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  inner: {
    position: "absolute",
    border: "3px solid orange",
    boxSizing: "border-box",
    display: "none",
  },
})
class CropArea extends React.PureComponent {
  state = {
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    pos: "i",
  };
  componentDidMount() {
    window.addEventListener("webkitfullscreenchange", this.handleResize, false);
    window.addEventListener("resize", this.handleResize, false);
    // We don't get "mouseup" for <div> if button was released outside
    // of its area so need a global one.
    window.addEventListener("mouseup", this.handleGlobalMouseUp, false);
    this.setRects();
  }
  componentWillReceiveProps(nextProps) {
    const acrop = this.props.crop;
    const bcrop = nextProps.crop;
    if (!acrop) return;
    // Check for nulls/undefined.
    if (acrop.cropw !== bcrop.cropw ||
        acrop.croph !== bcrop.croph ||
        acrop.cropx !== bcrop.cropx ||
        acrop.cropy !== bcrop.cropy) {
      this.setFFCrop(bcrop);
    }
  }
  componentWillUnmount() {
    window.removeEventListener("mouseup", this.handleGlobalMouseUp, false);
    window.removeEventListener("resize", this.handleResize, false);
    window.removeEventListener("webkitfullscreenchange",
                               this.handleResize, false);
  }

  domRect = null;
  vidRect = null;
  movOuter = false;
  movInner = false;
  moved = false;
  baseX = 0;
  baseY = 0;
  startPos = "i";
  startW = 0;
  startH = 0;
  startX = 0;
  startY = 0;

  setRects() {
    this.domRect = this.refs.outer.getClientRects()[0];
    this.vidRect = this.getVideoRect();
  }
  getTrackDims() {
    const {width, height} = this.props.vtrack;
    const sar = parseSAR(this.props.vtrack.sample_aspect_ratio);
    // Displayable video dimensions without taking window size into
    // account. Should be equal to mpv's dwidth/dheight properties.
    let dwidth = width;
    let dheight = height;
    if (sar > 1) {
      dwidth *= sar;
    } else {
      dheight *= sar;
    }
    const dar = dwidth / dheight;
    return {width, height, dwidth, dheight, sar, dar};
  }
  getVideoRect() {
    const {dwidth, dheight, dar} = this.getTrackDims();
    const {width: domWidth, height: domHeight} = this.domRect;
    const domSAR = domWidth / domHeight;
    let outWidth = 0;
    let outHeight = 0;
    // No way to get this from mpv. Assume video is inscribed into
    // provided area at center, no pan/scan enabled etc.
    if (domSAR > dar) {
      outWidth = dwidth * domHeight / dheight;
      outHeight = domHeight;
    } else {
      outWidth = domWidth;
      outHeight = dheight * domWidth / dwidth;
    }
    return {
      width: Math.round(outWidth),
      height: Math.round(outHeight),
      left: Math.round((domWidth - outWidth) / 2),
      top: Math.round((domHeight - outHeight) / 2),
    };
  }
  getCrop() {
    let {width, height, left, top} = this.state;
    // We allow width to be negative (grow in opposite dimension), so
    // need to fix before displaying.
    if (width < 0) {
      width = Math.abs(width);
      left -= width;
    }
    if (height < 0) {
      height = Math.abs(height);
      top -= height;
    }
    return {width, height, left, top};
  }
  isEmpty() {
    return !this.state.width || !this.state.height;
  }
  getOuterCursor() {
    return this.movInner ? this.getCursor() : "default";
  }
  getCursor() {
    if (this.movOuter) return "default";
    const pos = this.movInner ? this.startPos : this.state.pos;
    switch (pos) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "i":
      return "move";
    }
  }
  getCSSCrop() {
    // Not available until DOM is rendered.
    if (!this.vidRect) return null;
    let {width, height, left, top} = this.getCrop();
    left += this.vidRect.left;
    top += this.vidRect.top;
    const display = this.isEmpty() ? "none" : "block";
    const cursor = this.getCursor();
    return {width, height, left, top, display, cursor};
  }
  getFFCrop() {
    let {width: cropw, height: croph, left: cropx, top: cropy} = this.getCrop();
    if (this.isEmpty()) {
      // Will clear UI inputs.
      cropw = croph = cropx = cropy = null;
      return {cropw, croph, cropx, cropy};
    }
    const {dwidth, sar} = this.getTrackDims();
    const scalef = dwidth / this.vidRect.width;
    cropw = Math.round(cropw * scalef / sar);
    croph = Math.round(croph * scalef / sar);
    cropx = Math.round(cropx * scalef / sar);
    cropy = Math.round(cropy * scalef / sar);
    return {cropw, croph, cropx, cropy};
  }
  setFFCrop(crop) {
    const {width, height, dwidth, sar} = this.getTrackDims();
    const scalef = dwidth / this.vidRect.width;

    let {cropw, croph, cropx, cropy} = crop;
    if (cropw == null && croph == null) return this.clearCrop();
    // We allow to skip some values in UI, so need to emulate lavfi's
    // crop behavior.
    cropw = cropw == null ? width : cropw;
    croph = croph == null ? height : croph;
    cropx = cropx == null ? (width - cropw) / 2 : cropx;
    cropy = cropy == null ? (height - croph) / 2 : cropy;

    cropw = Math.round(cropw / scalef * sar);
    croph = Math.round(croph / scalef * sar);
    cropx = Math.round(cropx / scalef * sar);
    cropy = Math.round(cropy / scalef * sar);

    this.setCrop({width: cropw, height: croph, left: cropx, top: cropy},
                 null, {movOuter: true});
  }
  setCrop(upd, cb = null, opts = {}) {
    let {width, height, left, top} = {...this.state, ...upd};

    left = Math.min(Math.max(0, left), this.vidRect.width);
    top = Math.min(Math.max(0, top), this.vidRect.height);

    if (this.movOuter || (this.movInner && this.startPos !== "i") ||
        opts.movOuter) {
      width = width > 0 ? Math.min(width, this.vidRect.width - left)
                        : Math.max(-left, width);
      height = height > 0 ? Math.min(height, this.vidRect.height - top)
                          : Math.max(-top, height);
    } else if (this.movInner) {
      left = Math.min(left, this.vidRect.width - width);
      top = Math.min(top, this.vidRect.height - height);
    }

    this.setState({width, height, left, top}, cb);
  }
  clearCrop(cb = null) {
    this.setCrop({width: 0, height: 0}, cb);
  }
  sendCrop = () => {
    this.props.onCrop(this.getFFCrop());
  };

  handleResize = () => {
    this.setRects();
    // Need to either recalculate current crop area or just discard it.
    this.clearCrop(this.sendCrop);
  };
  handleOuterMouseDown = (e) => {
    this.movOuter = true;
    this.moved = false;
    this.baseX = e.clientX;
    this.baseY = e.clientY;
    this.startX = e.clientX - this.domRect.left - this.vidRect.left;
    this.startY = e.clientY - this.domRect.top - this.vidRect.top;
  };
  handleOuterMouseMove = (e) => {
    e.preventDefault();
    const dx = e.clientX - this.baseX;
    const dy = e.clientY - this.baseY;
    if (this.movOuter) {
      if (this.moved) {
        this.setCrop({width: dx, height: dy});
      } else {
        this.moved = true;
        this.setCrop({
          width: 0,
          height: 0,
          left: this.startX,
          top: this.startY,
        });
      }
    } else if (this.movInner) {
      let {startW: width, startH: height, startX: left, startY: top} = this;
      switch (this.startPos) {
      case "nw":
        left += dx;
        width -= dx;
        top += dy;
        height -= dy;
        break;
      case "se":
        width += dx;
        height += dy;
        break;
      case "ne":
        width += dx;
        top += dy;
        height -= dy;
        break;
      case "sw":
        left += dx;
        width -= dx;
        height += dy;
        break;
      case "n":
        top += dy;
        height -= dy;
        break;
      case "s":
        height += dy;
        break;
      case "e":
        width += dx;
        break;
      case "w":
        left += dx;
        width -= dx;
        break;
      case "i":
        left += dx;
        top += dy;
        break;
      }
      this.setCrop({width, height, left, top});
    }
  };
  handleGlobalMouseUp = () => {
    if (this.movOuter) {
      this.movOuter = false;
      if (this.moved) {
        this.sendCrop();
      } else {
        // It was just a click.
        this.props.onClick();
      }
    } else if (this.movInner) {
      this.movInner = false;
      this.sendCrop();
    }
  };
  handleInnerMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.movInner = true;
    this.baseX = e.clientX;
    this.baseY = e.clientY;
    this.startPos = this.state.pos;
    this.startW = this.state.width;
    this.startH = this.state.height;
    this.startX = this.state.left;
    this.startY = this.state.top;
  };
  handleInnerMouseMove = (e) => {
    const w = this.state.width;
    const h = this.state.height;
    const ox = e.nativeEvent.offsetX;
    const oy = e.nativeEvent.offsetY;
    const b = 10;
    let pos = "i";
    if (ox <= b && oy <= b) {
      pos = "nw";
    } else if (ox <= b && oy >= h - b) {
      pos = "sw";
    } else if (ox >= w - b && oy <= b) {
      pos = "ne";
    } else if (ox >= w - b && oy >= h - b) {
      pos = "se";
    } else if (ox <= 3) {
      pos = "w";
    } else if (oy <= 3) {
      pos = "n";
    } else if (ox >= w - b) {
      pos = "e";
    } else if (oy >= h - b) {
      pos = "s";
    }
    this.setState({pos});
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div
        ref="outer"
        style={{cursor: this.getOuterCursor()}}
        className={classes.outer}
        onMouseDown={this.handleOuterMouseDown}
        onMouseMove={this.handleOuterMouseMove}
      >
        <div
          style={this.getCSSCrop()}
          className={classes.inner}
          onMouseDown={this.handleInnerMouseDown}
          onMouseMove={this.handleInnerMouseMove}
        />
      </div>
    );
  }
}

const Controls = useSheet({
  controls: {
    padding: "5px 0 5px 5px",
    backgroundColor: "#eee",
    border: "solid #ccc",
    borderWidth: "1px 0",
  },
})(function(props, {classes}) {
  return <div className={classes.controls}>{props.children}</div>;
});

@useSheet({
  control: {
    cursor: "pointer",
    width: 44,
    padding: 0,
    lineHeight: "28px",
    fontSize: "18px",
    // verticalAlign: "middle",
    marginRight: 5,
    border: 0,
    backgroundColor: "#eee",
    float: "left",

    "&:hover:not($pressed)": {
      backgroundColor: "#ddd",
    },

    "&:disabled": {
      backgroundColor: "#eee !important",
      opacity: 0.5,
      cursor: "auto",
    },

    "&:active": {
      extend: "pressed",
    },
  },
  pressed: {
    backgroundColor: "#ddd",
    boxShadow: "0 2px 5px rgba(0,0,0,0.25) inset",
  },
  right: {
    float: "right",
  },
})
class Control extends React.PureComponent {
  handleKey = (e) => {
    e.preventDefault();
  };
  render() {
    const {classes} = this.sheet;
    const {icon, flip, pressed, right, ...other} = this.props;
    return (
      <Icon
        {...other}
        Component="button"
        name={icon}
        flip={flip ? "horizontal" : null}
        className={cx(classes.control, {
          [classes.pressed]: pressed,
          [classes.right]: right,
        })}
        onKeyDown={this.handleKey}
      />
    );
  }
}

@useSheet({
  volume: {
    float: "right",
    position: "relative",
  },
  slider: {
    display: "block",
    position: "absolute",
    width: 80,
    height: 20,
    left: -16,
    bottom: 58,
    margin: 0,
    cursor: "pointer",
    WebkitAppearance: "none",
    transform: "rotate(270deg)",
    background: "none",

    "&::-webkit-slider-thumb": {
      WebkitAppearance: "none",
      backgroundColor: "#ccc",
      cursor: "pointer",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      border: "1px solid #999",
    },

    "&::-webkit-slider-runnable-track": {
      height: "20px",
      borderRadius: "10px",
      border: "1px solid #999",
    },
  },
  hidden: {
    display: "none",
  },
}, {link: true})
class Volume extends React.PureComponent {
  constructor(props) {
    super(props);
    const {classes} = this.sheet;
    const sel = `.${classes.slider}::-webkit-slider-runnable-track`;
    this.progressRule = this.sheet.addRule(
      sel, {background: ""}, {named: false}
    );
  }
  state = {shown: false};
  isDragging() {
    return this.dragging;
  }
  toggleMute = () => {
    this.props.onChange({volume: this.props.volume, mute: !this.props.mute});
  };
  handleMouseOver = () => {
    if (this.props.disabled) return;
    this.setState({shown: true});
  };
  handleMouseOut = () => {
    this.setState({shown: false});
  };
  handleVolumeMouseDown = () => {
    this.dragging = true;
  };
  handleVolumeChange = (e) => {
    this.props.onChange({volume: +e.target.value, mute: false});
  };
  handleVolumeMouseUp = () => {
    this.dragging = false;
  };
  render() {
    const {classes} = this.sheet;
    let volPercent = this.props.volume;
    // Fix for different scale resolutions.
    volPercent = this.props.mute
      ? 0
      : volPercent < 15
        ? volPercent * 2
        : volPercent < 50
          ? volPercent * 1.1
          : volPercent / 1.1;
    this.progressRule.prop("background", `
      -webkit-linear-gradient(
        left,
        #ddd ${volPercent}%,
        #ddd ${volPercent}%,
        #fff ${volPercent}%
      )
    `);
    const icon = (this.props.mute ||
                  this.props.volume < 1 ||
                  this.props.disabled)
      ? "volume-off"
      : "volume-up";
    return (
      <div
        className={classes.volume}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
      >
        <input
          type="range"
          title="Change volume"
          className={cx(classes.slider, {[classes.hidden]: !this.state.shown})}
          value={this.props.mute ? 0 : this.props.volume}
          onMouseDown={this.handleVolumeMouseDown}
          onChange={this.handleVolumeChange}
          onMouseUp={this.handleVolumeMouseUp}
        />
        <Control
          icon={icon}
          title="Toggle mute"
          disabled={this.props.disabled}
          onClick={this.toggleMute}
        />
      </div>
    );
  }
}

@useSheet({
  time: {
    width: 100,
    height: 28,
    verticalAlign: "top",
    boxSizing: "border-box",
    textAlign: "center",
    fontSize: "19px",
    float: "left",
    marginRight: 5,
    border: "1px solid #ccc",
    backgroundColor: "#f8f8f8",
    "&:focus": {
      outline: "none",
    },
  },
  invalid: {
    borderColor: "red !important",
    color: "red",
  },
})
class Time extends React.PureComponent {
  focus() {
    this.refs.input.focus();
    this.refs.input.select();
  }
  blur() {
    this.refs.input.blur();
  }
  render() {
    const {classes} = this.sheet;
    const {invalid, ...other} = this.props;
    return (
      <input
        {...other}
        ref="input"
        type="text"
        className={cx(classes.time, invalid && classes.invalid)}
      />
    );
  }
}

@useSheet({
  seek: {
    display: "block",
    overflow: "hidden",
    padding: "0 10px",

  },
  range: {
    display: "block",
    width: "100%",
    height: 28,
    margin: 0,
    cursor: "pointer",
    backgroundColor: "#eee",
    WebkitAppearance: "none",

    "&::-webkit-slider-thumb": {
      WebkitAppearance: "none",
      backgroundColor: "#eee",
      cursor: "pointer",
      width: 20,
      height: 20,
      marginTop: -9,
      borderRadius: "50%",
      border: "2px solid #999",
    },

    "&:hover::-webkit-slider-thumb": {
      backgroundColor: "#ccc",
    },

    "&:active::-webkit-slider-thumb": {
      backgroundColor: "#ccc",
      boxShadow: "0 1px 2px rgba(0,0,0,0.25) inset",
    },

    "&::-webkit-slider-runnable-track": {
      height: 3,
      borderRadius: 3,
    },
  },
}, {link: true})
class Seek extends React.PureComponent {
  constructor(props) {
    super(props);
    const {classes} = this.sheet;
    const sel = `.${classes.range}::-webkit-slider-runnable-track`;
    this.progressRule = this.sheet.addRule(
      sel, {background: ""}, {named: false}
    );
  }
  handleKey = (e) => {
    e.preventDefault();
  };
  render() {
    const {classes} = this.sheet;
    const {mstart, mend, ...other} = this.props;
    const mstartPercent = mstart / other.max * 100;
    const mendPercent = mend / other.max * 100;
    this.progressRule.prop("background", `
      -webkit-linear-gradient(
        left,
        #bdbdbd ${mstartPercent}%,
        orange ${mstartPercent}%,
        orange ${mendPercent}%,
        #bdbdbd ${mendPercent}%
      )
    `);
    return (
      <div className={classes.seek}>
        <input
          {...other}
          step={0.1}
          type="range"
          className={classes.range}
          onKeyDown={this.handleKey}
        />
      </div>
    );
  }
}
