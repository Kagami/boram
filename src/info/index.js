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
  },
  error: {
    color: "red",
    marginBottom: 30,
  },
})
export default class extends React.Component {
  state = {}
  componentDidMount() {
    let ff = null;
    this.props.events.on("cleanup", () => {
      try {
        ff.kill("SIGKILL");
      } catch (e) {
        /* skip */
      }
    });

    ff = FFprobe.getInfo(this.props.source.path);
    ff.then(info => {
      this.props.onLoad(info);
    }, error => {
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
