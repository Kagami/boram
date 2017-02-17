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

const YT_FEXT = ".mkv";

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
  state = {progress: 0, status: "", error: null};
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
    // Might actually end up MOV with .mkv extension but we'll remux it
    // to Matroska right away and FFmpeg doesn't care about input ext.
    this.tmpYTName = tmp.tmpNameSync({prefix: "boram-", postfix: YT_FEXT});
    // Source provider passed further. Cleaned only on cancel/exit.
    this.tmpSource = tmp.fileSync({prefix: "boram-", postfix: ".mkv"});
    this.handleDownload();
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
  }
  canceling = false;
  handleDownload = () => {
    const progress = 0;
    this.setState({progress, status: "spawning youtube-dl", error: null});
    this.props.onProgress(progress);
    const {info, format} = this.props;
    const url = info.webpage_url;
    const outpath = this.tmpYTName;
    this.ytdl = YouTubeDL.download({url, format, outpath}, (upd) => {
      const {progress, status} = upd;
      this.setState({progress, status});
      this.props.onProgress(progress);
    });
    this.ytdl.then(() => {
      const progress = 100;
      this.setState({progress, status: "writing title to metadata"});
      this.props.onProgress(progress);
      const inpath = this.tmpYTName;
      const outpath = this.tmpSource.name;
      // URL might be rather long to put it into title (e.g. extra query
      // args) but that's hard to fix in general case.
      const title = `${info.title} <${url}>`;
      this.ff = FFmpeg.setTitle({inpath, outpath, title});
      return this.ff;
    }).then(() => {
      // We hope ytdl already made all correct escapings.
      const saveAs = info._filename;
      const source = {saveAs, path: this.tmpSource.name};
      this.props.onLoad(source);
      this.cleanYT();
    }, (error) => {
      const progress = 0;
      this.props.onProgress(progress);
      // Prevent `setState` on unmounted component.
      if (!this.canceling) {
        this.setState({progress, error});
      }
    });
  };
  // ytdl doesn't clean after itself, so here we go...
  cleanYT = () => {
    const {vfid, afid, sfid, sext} = this.props.format;
    const cleanName = this.tmpYTName.slice(0, -YT_FEXT.length);

    // Basic download target, e.g.: "1.mkv".
    // (Note that we disable ".part" files.)
    try { fs.unlinkSync(this.tmpYTName); } catch (e) { /* skip */ }

    // Postprocessors, e.g.: "1.temp.mkv".
    const ppName = `${cleanName}.temp${YT_FEXT}`;
    try { fs.unlinkSync(ppName); } catch (e) { /* skip */ }

    // Multi-format downloads, e.g.: "1.mkv.f137", "1.mkv.f251".
    if (afid) {
      const vfName = `${this.tmpYTName}.f${vfid}`;
      try { fs.unlinkSync(vfName); } catch (e) { /* skip */ }
      const afName = `${this.tmpYTName}.f${afid}`;
      try { fs.unlinkSync(afName); } catch (e) { /* skip */ }
    }

    // Subtitle downloads, e.g.: "1.ja_JP.vtt".
    if (sfid) {
      const sfName = `${cleanName}.${sfid}.${sext}`;
      try { fs.unlinkSync(sfName); } catch (e) { /* skip */ }
    }
  };
  abort = () => {
    try { this.ytdl.kill("SIGKILL"); } catch (e) { /* skip */ }
    try { this.ff.kill("SIGKILL"); } catch (e) { /* skip */ }
    this.cleanYT();
  };
  handleCancel = () => {
    // Next time component will be recreated.
    this.canceling = true;
    this.abort();
    // Not needed anymore. Also no need to clean manually on abort
    // because `setGracefulCleanup` from main process will clean for us.
    // It will do that even when the current component is unmounted.
    try { this.tmpSource.removeCallback(); } catch (e) { /* skip */ }
    this.props.onCancel();
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div>
        <div className={cx(classes.status, this.state.error && classes.error)}>
          {this.state.error ? showErr(this.state.error) : this.state.status}
        </div>
        <BigProgress
          height={40}
          value={this.state.progress}
        />
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
