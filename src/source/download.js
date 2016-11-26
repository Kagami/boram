/**
 * Download source video with youtube-dl.
 * @module boram/source/download
 */

import fs from "fs";
import React from "react";
import cx from "classnames";
import YouTubeDL from "../youtube-dl";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {BigProgress, BigButton, Sep} from "../theme";
import {tmp, showErr} from "../util";

@useSheet({
  status: {
    width: 505,
    height: 40,
    lineHeight: "40px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#333",
  },
  error: {
    color: "red",
  },
})
export default class extends React.PureComponent {
  state = {progress: 0, status: "", error: null}
  componentDidMount() {
    this.props.events.addListener("cleanup", this.cleanup);
    const {afid, ext} = this.props.format;
    const postfix = afid ? ".mkv" : `.${ext}`;
    // ytdl might complain if its destination file exists, so we can't
    // use `fileSync` helper.
    this.tmpYTname = tmp.tmpNameSync({prefix: "boram-", postfix});
    this.tmpFF = tmp.fileSync({prefix: "boram-", postfix: ".mkv"});
    this.handleDownload();
  }
  componentWillUnmount() {
    this.props.events.removeListener("cleanup", this.cleanup);
  }
  handleDownload = () => {
    this.setState({progress: 0, status: "spawning youtube-dl", error: null});
    const url = this.props.info.webpage_url;
    const {vfid, afid} = this.props.format;
    const format = vfid + (afid ? `+${afid}` : "");
    const outpath = this.tmpYTname;
    this.ytdl = YouTubeDL.download({url, format, outpath}, (upd) => {
      const {progress, status} = upd;
      this.setState({progress, status});
    }).then(() => {
      this.setState({progress: 100, status: "writing title to metadata"});
      const inpath = this.tmpYTname;
      const outpath = this.tmpFF.name;
      // URL might be rather long to put it into title (e.g. extra query
      // args) but that's hard to fix in general case.
      const title = `${this.props.info.title} <${url}>`;
      this.ff = FFmpeg.setTitle({inpath, outpath, title});
      return this.ff;
    }).then(() => {
      const source = {path: this.tmpFF.name};
      this.props.onLoad(source);
    }, (error) => {
      const progress = 0;
      this.setState({progress, error});
    }).then(this.removeYT, this.removeYT);
  };
  cleanup = () => {
    // ytdl should have a chance to remote its temporary files, so we
    // don't SIGKILL it.
    try { this.ytdl.kill("SIGTERM"); } catch (e) { /* skip */ }
    try { this.ff.kill("SIGKILL"); } catch (e) { /* skip */ }
  };
  removeYT = () => {
    try { fs.unlinkSync(this.tmpYTname); } catch (e) { /* skip */ }
  };
  handleCancel = () => {
    this.cleanup();
    this.removeYT();
    try { this.tmpFF.removeCallback(); } catch (e) { /* skip */ }
    this.props.onCancel();
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div>
        <div className={cx(classes.status, this.state.error && classes.error)}>
          {this.state.error ? showErr(this.state.error) : this.state.status}
        </div>
        <BigProgress value={this.state.progress} />
        <Sep vertical />
        <BigButton
          width={250}
          height={40}
          label="retry"
          labelStyle={{fontSize: "inherit"}}
          disabled={!this.state.error}
          onClick={this.handleDownload}
        />
        <Sep margin={2.5} />
        <BigButton
          width={250}
          height={40}
          label="cancel"
          labelStyle={{fontSize: "inherit"}}
          onClick={this.handleCancel}
        />
      </div>
    );
  }
}
