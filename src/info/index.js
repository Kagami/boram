/**
 * Analyze source video.
 * @module boram/info
 */

import React from "react";
import FFprobe from "../ffprobe";
import {useSheet} from "../jss";
import {BigButton} from "../theme";
import ShowHide from "../show-hide";
import {showErr} from "../util";

@useSheet({
  info: {
    display: "flex",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  inner: {
    width: "70%",
  },
  error: {
    marginBottom: 30,
    color: "red",
    // <https://stackoverflow.com/q/15909489>.
    display: "-webkit-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    WebkitLineClamp: 10,
    WebkitBoxOrient: "vertical",
  },
})
export default class extends React.PureComponent {
  state = {}
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
    this.ff = FFprobe.getInfo(this.props.source.path);
    this.ff.then(info => {
      const vtrack = info.streams.find(t =>
        t.codec_type === "video" && !t.disposition.attached_pic
      );
      if (!vtrack) throw new Error("No video tracks found");
      return info;
    }).then(info => {
      this.props.onLoad(info);
    }, error => {
      this.setState({error});
    });
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
  }
  abort = () => {
    try { this.ff.kill("SIGKILL"); } catch (e) { /* skip */ }
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.info}>
        <div className={classes.inner}>
          <ShowHide show={!this.state.error}>
            <h2>Gathering video info…</h2>
          </ShowHide>
          <ShowHide show={!!this.state.error}>
            <div className={classes.error}>{showErr(this.state.error)}</div>
            <BigButton
              width={250}
              height={40}
              label="cancel"
              labelStyle={{fontSize: "inherit"}}
              onClick={this.props.onCancel}
            />
          </ShowHide>
        </div>
      </div>
    );
  }
}
