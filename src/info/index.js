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
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: "red",
    marginBottom: 30,
  },
})
export default class extends React.Component {
  state = {}
  componentDidMount() {
    let ffchild = null;
    this.props.events.on("cleanup", () => {
      if (ffchild) {
        ffchild.kill("SIGKILL");
      }
    });

    const ff = FFprobe.getInfo(this.props.source.path);
    ffchild = ff.child;
    ff.then(info => {
      ffchild = null;
      this.props.onLoad(info);
    }, error => {
      ffchild = null;
      this.setState({error});
    });
  }
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.info}>
        <ShowHide show={!this.state.error}>
          <h2>Gathering video info…</h2>
        </ShowHide>
        <ShowHide show={!!this.state.error}>
          <div className={classes.error}>{showErr(this.state.error)}</div>
          <BigButton
            label="Cancel"
            onClick={this.props.onCancel}
          />
        </ShowHide>
      </div>
    );
  }
}
