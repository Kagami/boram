/**
 * Download source video with youtube-dl.
 * @module boram/source/download
 */

import fs from "fs";
import path from "path";
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
    height: "auto",
    lineHeight: "inherit",
    display: "-webkit-box",
    WebkitLineClamp: 10,
    WebkitBoxOrient: "vertical",
  },
})
export default class extends React.PureComponent {
  state = {progress: 0, status: "", error: null}
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
    const {afid, ext} = this.props.format;
    const postfix = afid ? ".mkv" : `.${ext}`;
    // ytdl complains if its destination file exists, so we can't use
    // `fileSync` helper.
    this.tmpYTName = tmp.tmpNameSync({prefix: "boram-", postfix});
    this.tmpFF = tmp.fileSync({prefix: "boram-", postfix: ".mkv"});
    this.handleDownload();
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
  }
  handleDownload = () => {
    const progress = 0;
    this.setState({progress, status: "spawning youtube-dl", error: null});
    this.props.onProgress(progress);
    const {info} = this.props;
    const url = info.webpage_url;
    const {vfid, afid} = this.props.format;
    const format = vfid + (afid ? `+${afid}` : "");
    const outpath = this.tmpYTName;
    this.ytdl = YouTubeDL.download({url, format, outpath}, (upd) => {
      const {progress, status} = upd;
      this.setState({progress, status});
      this.props.onProgress(progress);
    }).then(() => {
      const progress = 100;
      this.setState({progress, status: "writing title to metadata"});
      this.props.onProgress(progress);
      const inpath = this.tmpYTName;
      const outpath = this.tmpFF.name;
      // URL might be rather long to put it into title (e.g. extra query
      // args) but that's hard to fix in general case.
      const title = `${info.title} <${url}>`;
      this.ff = FFmpeg.setTitle({inpath, outpath, title});
      return this.ff;
    }).then(() => {
      // We hope ytdl already made all correct escapings.
      const saveAs = `${path.parse(info._filename).name}.webm`;
      const source = {saveAs, path: this.tmpFF.name};
      this.props.onLoad(source);
    }, (error) => {
      const progress = 0;
      this.setState({progress, error});
      this.props.onProgress(progress);
    }).then(this.cleanYT, this.cleanYT);
  };
  abort = () => {
    // ytdl should have a chance to remote its temporary files, so we
    // don't SIGKILL it.
    try { this.ytdl.kill("SIGTERM"); } catch (e) { /* skip */ }
    try { this.ff.kill("SIGKILL"); } catch (e) { /* skip */ }
  };
  cleanYT = () => {
    try { fs.unlinkSync(this.tmpYTName); } catch (e) { /* skip */ }
  };
  handleCancel = () => {
    this.abort();
    this.cleanYT();
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
