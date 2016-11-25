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
  error: {
    color: "red",
    marginBottom: 30,
  },
})
export default class extends React.Component {
  state = {}
  componentDidMount() {
    this.props.events.addListener("cleanup", this.cleanup);
    this.ff = FFprobe.getInfo(this.props.source.path);
    this.ff.then(info => {
      this.props.onLoad(info);
    }, error => {
      this.setState({error});
    });
  }
  componentWillUnmount() {
    this.props.events.removeListener("cleanup", this.cleanup);
  }
  cleanup = () => {
    try { this.ff.kill("SIGKILL"); } catch (e) { /* skip */ }
  };
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
            width={250}
            height={40}
            label="cancel"
            onClick={this.props.onCancel}
          />
        </ShowHide>
      </div>
    );
  }
}
