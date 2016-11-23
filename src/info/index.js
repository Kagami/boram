/**
 * Analyze source video.
 * @module boram/info
 */

import React from "react";
import FFprobe from "../ffprobe";
import {useSheet} from "../jss";
import {CircularProgress, RaisedButton} from "../theme";
import ShowHide from "../show-hide";
import {showErr} from "../util";

@useSheet({
  header: {
    marginBottom: 30,
  },
  progress: {
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
      <div>
        <h2 className={classes.header}>Gathering video info</h2>
        <ShowHide show={!this.state.error}>
          <div className={classes.progress}>
            <CircularProgress size={300} thickness={10} />
          </div>
        </ShowHide>
        <ShowHide show={!!this.state.error}>
          <div className={classes.error}>{showErr(this.state.error)}</div>
          <RaisedButton
            secondary
            label="Cancel"
            onClick={this.props.onCancel}
          />
        </ShowHide>
      </div>
    );
  }
}
