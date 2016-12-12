/**
 * Enhanced video element.
 * @module boram/player
 */

import React from "react";
import cx from "classnames";
import {useSheet} from "../jss";
import {Icon} from "../theme";
import MPV from "../mpv";
import {parseTime, showTime, tryRun} from "../util";

@useSheet({
  player: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
  },
})
export default class extends React.PureComponent {
  state = {pause: true, time: 0, volume: 100, mute: false, fullscreen: false}
  componentWillMount() {
    this.setTime(this.state.time);
  }
  componentDidMount() {
    document.addEventListener("keydown", this.handleGlobaKey, false);
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleGlobaKey, false);
  }
  duration = parseFloat(this.props.format.duration)
  // NOTE(Kagami): currentTime/mstart/mend are floats so need
  // small adjustements in order to keep them in sync.
  isAlmostEqual(a, b) {
    return Math.abs(a - b) < 0.001;
  }
  isMarkStartDisabled() {
    const mend = this.props.mend || this.duration;
    return (
      this.isAlmostEqual(this.state.time, this.props.mstart) ||
      this.state.time > mend - 0.001
    );
  }
  isMarkEndDisabled() {
    return (
      this.isAlmostEqual(this.state.time, this.props.mend) ||
      this.state.time < this.props.mstart + 0.001 ||
      (!this.props.mend && this.state.time > this.duration - 0.001)
    );
  }
  // "Stupid" play/pause actions.
  play() {
    this.refs.mpv.play();
  }
  pause() {
    this.refs.mpv.pause();
  }
  seek(time) {
    this.refs.mpv.seek(time);
    // We improve UX by changing slider pos immediately.
    this.setState({time});
  }
  loadExtSub(extSubPath) {
    this.refs.mpv.loadExtSub(extSubPath);
  }
  // Displayed time info.
  setTime(time) {
    const prettyTime = showTime(time);
    const validTime = true;
    this.setState({prettyTime, validTime});
  }
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
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.player}>
        <MPV
          ref="mpv"
          src={this.props.source.path}
          onClick={this.togglePlay}
          onPlayPause={this.handlePlayPause}
          onTime={this.handleTime}
          onVolume={this.handleVolume}
          onEOF={this.handleEOF}
        />
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
            max={Math.max(1, Math.ceil(this.duration))}
            mstart={Math.floor(this.props.mstart)}
            mend={Math.floor(this.props.mend)}
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
  }
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
  state = {shown: false}
  isDragging() {
    return this.dragging;
  }
  toggleMute = () => {
    this.props.onChange({volume: this.props.volume, mute: !this.props.mute});
  }
  handleMouseOver = () => {
    if (this.props.disabled) return;
    this.setState({shown: true});
  }
  handleMouseOut = () => {
    this.setState({shown: false});
  }
  handleVolumeMouseDown = () => {
    this.dragging = true;
  }
  handleVolumeChange = (e) => {
    this.props.onChange({volume: +e.target.value, mute: false});
  }
  handleVolumeMouseUp = () => {
    this.dragging = false;
  }
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
      borderColor: "#000",
    },
  },
  invalid: {
    borderColor: "#f00 !important",
    color: "#f00",
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
        maxLength={9}
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
        #00bcd4 ${mstartPercent}%,
        #00bcd4 ${mendPercent}%,
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
