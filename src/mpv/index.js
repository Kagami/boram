/**
 * mpv interop layer.
 * @module boram/mpv
 */

import React from "react";
import {useSheet} from "../jss";
if (BORAM_WIN_BUILD) {
  require("file!../../bin/32/mpv-1.dll");
}

@useSheet({
  plugin: {
    display: "block",
    width: "100%",
    height: "100%",
    flex: 1,
  },
})
export default class extends React.PureComponent {
  componentDidMount() {
    // TODO(Kagami): Handle plugin init errors.
    this.refs.plugin.addEventListener("message", this.handleMessage, false);
  }
  componentWillUnmount() {
    this.refs.plugin.removeEventListener("message", this.handleMessage, false);
  }
  getNode() {
    return this.refs.plugin;
  }
  play() {
    this.postData("pause", false);
  }
  pause() {
    this.postData("pause", true);
  }
  seek(time) {
    this.postData("seek", time);
  }
  setVolume({volume, mute}) {
    this.postData("volume", {volume, mute});
  }
  loadExtSub(extSubPath) {
    this.postData("load-ext-sub", extSubPath);
  }
  sendKey = ({key, shiftKey, ctrlKey}) => {
    // Don't need modifier events.
    if ([
      "Shift", "Control", "Alt",
      "Compose", "CapsLock", "Meta",
    ].includes(key)) return;

    if (key.startsWith("Arrow")) {
      key = key.slice(5).toUpperCase();
      if (shiftKey) {
        key = `Shift+${key}`;
      }
    }
    if (ctrlKey) {
      key = `Ctrl+${key}`;
    }

    // Ignore exit keys for default keybindings settings. Kludgy but mpv
    // don't propose anything better.
    if ([
      "q", "Q", "ESC", "POWER", "STOP",
      "CLOSE_WIN", "CLOSE_WIN", "Ctrl+c",
      "AR_PLAY_HOLD", "AR_CENTER_HOLD",
    ].includes(key)) return;

    this.postData("keypress", key);
  }
  postData(type, data) {
    const msg = {type, data};
    // console.log("@@@ SEND", JSON.stringify(msg));
    this.refs.plugin.postMessage(msg);
  }
  handleMessage = (e) => {
    const msg = e.data;
    // console.log("@@@ RECV", JSON.stringify(msg));
    switch (msg.type) {
    case "wakemeup":
      this.postData("wakeup", null);
      break;
    case "pause":
      this.props.onPlayPause(msg.data);
      break;
    case "time-pos":
      this.props.onTime(Math.max(0, msg.data));
      break;
    case "volume":
      this.props.onVolume({volume: Math.floor(msg.data)});
      break;
    case "mute":
      this.props.onVolume({mute: msg.data});
      break;
    case "eof-reached":
      if (msg.data) {
        this.props.onEOF();
      }
      break;
    }
  }
  render() {
    const {classes} = this.sheet;
    const {src, onClick} = this.props;
    return (
      <embed
        ref="plugin"
        className={classes.plugin}
        type="application/x-boram"
        data-boramsrc={src}
        onTouchTap={onClick}
      />
    );
  }
}
