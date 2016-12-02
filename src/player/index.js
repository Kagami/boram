/**
 * Enhanced video element.
 * @module boram/player
 */

import React from "react";
import cx from "classnames";
import Icon from "react-fa";
import {useSheet} from "../jss";
import {parseTime, showTime, parseTimeBase, tryRun} from "../util";

const KEY_SPACE = 32;
const KEY_ESC = 27;
const KEY_COMMA = 188;
const KEY_DOT = 190;
const KEY_F = 70;
const KEY_T = 84;
const KEY_ENTER = 13;

@useSheet({
  player: {
    position: "relative",
    height: "100%",
  },
})
export default class extends React.PureComponent {
  constructor(props) {
    super(props);
    this.duration = parseFloat(this.props.format.duration);
    // XXX(Kagami): This won't work with VFR or wrong FPS value.
    this.framed = parseTimeBase(this.props.vtrack.codec_time_base);
  }
  state = {time: 0}
  componentWillMount() {
    this.setTime(this.state.time);
  }
  componentDidMount() {
    document.addEventListener("keydown", this.handleGlobaKey, false);
    // Not supported by React.
    this.getVideoNode().addEventListener(
      "webkitfullscreenchange", this.handleFullscreenEvent, false
    );
    this.handleVolumeEvent();
  }
  componentWillUnmount() {
    this.getVideoNode().removeEventListener(
      "webkitfullscreenchange", this.handleFullscreenEvent, false
    );
    document.removeEventListener("keydown", this.handleGlobaKey, false);
  }
  getVideoURL() {
    return "file://" + this.props.source.path;
  }
  getVideoNode() {
    return this.refs.video.getNode();
  }
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
    this.getVideoNode().play();
  }
  pause() {
    this.getVideoNode().pause();
  }
  seek(time) {
    // Improve experience by changing slider pos immediately.
    this.setState({time});
    this.getVideoNode().currentTime = time;
  }
  setTime(time) {
    const prettyTime = showTime(time);
    const validTime = true;
    this.setState({prettyTime, validTime});
  }
  // "Smart" play/pause action.
  togglePlay = () => {
    const time = this.getVideoNode().currentTime;
    const mend = this.props.mend || this.duration;
    const action = this.state.playing ? "pause" : "play";
    if (action === "play" &&
        this.state.loopCut &&
        (time < this.props.mstart + 0.001 || time > mend - 0.001)) {
      // We can start playing right away and `handleTimeUpdateEvent`
      // will handle `loopCut` anyway but that will play out-of-loop
      // video for some period of time.
      this.seek(this.props.mstart);
    // } else if (action === "play" && time >= Math.floor(this.duration)) {
    //   // If we have e.g. video with duration = 3s which consists of
    //   // frames with timestamps [0s, 1s, 2s] then if currentTime is at
    //   // 2s and playing is false, play() call will set currentTime to 3s
    //   // and playing to false again. This is not what we probably want.
    //   this.seek(0);
    }
    this[action]();
  };
  toggleFullscreen = () => {
    if (this.state.fullscreen) {
      document.webkitExitFullscreen();
    } else {
      this.getVideoNode().webkitRequestFullscreen();
    }
  };
  toggleLoopCut = () => {
    this.setState({loopCut: !this.state.loopCut});
  };
  handleGlobaKey = (e) => {
    if (!this.props.active) return;
    switch (e.keyCode) {
    case KEY_SPACE:
      this.togglePlay();
      break;
    case KEY_ESC:
      if (this.state.fullscreen) this.toggleFullscreen();
      break;
    case KEY_COMMA:
      if (this.state.time >= this.framed) {
        this.seek(this.state.time - this.framed);
      }
      break;
    case KEY_DOT:
      if (this.state.time <= this.duration - this.framed) {
        this.seek(this.state.time + this.framed);
      }
      break;
    case KEY_F:
      this.toggleFullscreen();
      break;
    case KEY_T:
      this.refs.time.focus();
      // Prevent replacing time with "t" on focus.
      e.preventDefault();
      break;
    }
  };
  handleTimeKey = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    switch (e.keyCode) {
    case KEY_ENTER:
      if (this.state.validTime) {
        const time = parseTime(this.state.prettyTime);
        const prettyTime = showTime(time);
        this.setState({prettyTime});
        this.seek(time);
        this.refs.time.blur();
      }
      break;
    case KEY_ESC:
      this.refs.time.blur();
      break;
    }
  };
  handlePlayEvent = () => {
    this.setState({playing: true});
  };
  handlePauseEvent = () => {
    this.setState({playing: false});
  };
  handleTimeUpdateEvent = () => {
    if (this.seekDrag) return;
    const time = this.getVideoNode().currentTime;
    const mend = this.props.mend || this.duration;
    if (this.state.playing &&
        this.state.loopCut &&
        (time < this.props.mstart + 0.001 || time > mend - 0.001)) {
      this.seek(this.props.mstart);
      this.play();
      return;
    }
    this.setTime(time);
    this.setState({time});
  };
  handleVolumeEvent = () => {
    const {volume, muted} = this.getVideoNode();
    // Pass-through to sub-component.
    this.refs.volume.handleVolumeEvent({volume, muted});
  };
  handleWheelEvent = (e) => {
    const video = this.getVideoNode();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    video.volume = Math.min(Math.max(0, video.volume + delta), 1);
    video.muted = false;
  };
  handleFullscreenEvent = () => {
    this.setState({fullscreen: !this.state.fullscreen});
  };
  handleMarkStart = () => {
    this.props.onMarkStart(this.state.time);
  };
  handleMarkEnd = () => {
    this.props.onMarkEnd(this.state.time);
  };
  handleTimeChange = (e) => {
    const prettyTime = e.target.value;
    const time = tryRun(parseTime, prettyTime);
    const validTime = time != null && time <= this.duration;
    this.setState({prettyTime, validTime});
  };
  handleSeekMouseDown = () => {
    this.seekDrag = true;
  };
  handleSeekChange = (e) => {
    const time = parseInt(e.target.value, 10);
    this.setTime(time);
    this.seek(time);
  };
  handleSeekMouseUp = () => {
    this.seekDrag = false;
  };
  handleControlVolumeChange = ({volume, muted}) => {
    const video = this.getVideoNode();
    video.volume = volume;
    video.muted = muted;
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.player} onWheel={this.handleWheelEvent}>
        <Video
          ref="video"
          src={this.getVideoURL()}
          onClick={this.togglePlay}
          onPlaying={this.handlePlayEvent}
          onPause={this.handlePauseEvent}
          onTimeUpdate={this.handleTimeUpdateEvent}
          onVolumeChange={this.handleVolumeEvent}
          onDoubleClick={this.toggleFullscreen}
        />
        <Controls>
          <Control
            icon={this.state.playing ? "pause" : "play"}
            title="Play/pause"
            onClick={this.togglePlay}
          />
          <Control
            flip
            icon="scissors"
            title="Mark fragment start"
            disabled={this.isMarkStartDisabled()}
            onClick={this.handleMarkStart}
          />
          <Time
            ref="time"
            value={this.state.prettyTime}
            onChange={this.handleTimeChange}
            onKeyDown={this.handleTimeKey}
            invalid={!this.state.validTime}
          />
          <Control
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
            onChange={this.handleControlVolumeChange}
          />
          <Seek
            value={Math.floor(this.state.time)}
            max={Math.max(1, Math.floor(this.duration))}
            mstart={Math.floor(this.props.mstart)}
            mend={Math.floor(this.props.mend)}
            onMouseDown={this.handleSeekMouseDown}
            onChange={this.handleSeekChange}
            onMouseUp={this.handleSeekMouseUp}
          />
        </Controls>
      </div>
    );
  }
}

// Player sub-components.

@useSheet({
  video: {
    position: "absolute",
    width: "100%",
    top: 0,
    bottom: 40,
    background: "#000",
  },
  videoInner: {
    display: "block",
    width: "100%",
    height: "100%",
  },
})
class Video extends React.PureComponent {
  getNode() {
    return this.refs.video;
  }
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.video}>
        <video {...this.props} ref="video" className={classes.videoInner} />
      </div>
    );
  }
}

const Controls = useSheet({
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
  constructor() {
    super();
    const sel = `.${this.sheet.classes.slider}::-webkit-slider-runnable-track`;
    this.progressRule = this.sheet.addRule(
      sel, {background: ""}, {named: false}
    );
  }
  state = {}
  toggleMuted = () => {
    const opts = {volume: this.state.volume, muted: !this.state.muted};
    this.setState(opts);
    this.props.onChange(opts);
  }
  handleVolumeEvent = ({volume, muted}) => {
    if (this.volumeDrag) return;
    this.setState({volume, muted});
  }
  handleMouseOver = () => {
    this.setState({shown: true});
  }
  handleMouseOut = () => {
    this.setState({shown: false});
  }
  handleVolumeMouseDown = () => {
    this.volumeDrag = true;
  }
  handleVolumeChange = (e) => {
    const opts = {volume: e.target.value / 100, muted: false};
    this.setState(opts);
    this.props.onChange(opts);
  }
  handleVolumeMouseUp = () => {
    this.volumeDrag = false;
  }
  render() {
    const {classes} = this.sheet;
    let volPercent = this.state.volume * 100;
    // Fix for different scale resolutions.
    volPercent = this.state.muted
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
    const icon = (this.state.muted || this.state.volume < 0.01)
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
          value={this.state.muted ? 0 : this.state.volume * 100}
          onMouseDown={this.handleVolumeMouseDown}
          onChange={this.handleVolumeChange}
          onMouseUp={this.handleVolumeMouseUp}
        />
        <Control
          icon={icon}
          title="Toggle mute"
          onClick={this.toggleMuted}
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
  constructor() {
    super();
    const sel = `.${this.sheet.classes.range}::-webkit-slider-runnable-track`;
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
          type="range"
          className={classes.range}
          onKeyDown={this.handleKey}
        />
      </div>
    );
  }
}
