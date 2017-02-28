/**
 * Download source video with youtube-dl.
 * @module boram/source/download
 */

import fs from "fs";
import {remote} from "electron";
import tmp from "tmp";
import React from "react";
import cx from "classnames";
import YouTubeDL from "../youtube-dl";
import {useSheet} from "../jss";
import {BigProgress, BigButton, Sep} from "../theme";
import {showErr} from "../util";

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
    // Source provider passed further. Cleaned only on cancel/exit.
    // Might actually end up being flv/mov with .mkv extension but
    // FFmpeg doesn't care about filenames.
    this.sourceName = tmp.tmpNameSync({prefix: "boram-", postfix: YT_FEXT});
    remote.getGlobal("removeOnQuit")(this.sourceName);
    this.handleDownload();
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
  }
  handleDownload = () => {
    this.setState({progress: 0, status: "spawning youtube-dl", error: null});
    this.props.onProgress(0);
    const {info, format} = this.props;
    const url = info.webpage_url;
    const outpath = this.sourceName;
    this.ytdl = YouTubeDL.download({url, format, outpath}, (upd) => {
      const {progress, status} = upd;
      this.setState({progress, status});
      this.props.onProgress(progress);
    });
    this.ytdl.then(() => {
      const progress = 100;
      this.props.onProgress(progress);
      // We hope ytdl already made all correct escapings.
      const saveAs = info._filename;
      const title = `${info.title} <${url}>`;
      this.props.onLoad({saveAs, title, path: outpath});
    }, (error) => {
      const progress = 0;
      this.props.onProgress(progress);
      this.setState({progress, error});
    });
  };
  // ytdl doesn't clean after itself, so here we go...
  cleanYT = () => {
    const {vfid, afid, sfid, sext} = this.props.format;
    const cleanName = this.sourceName.slice(0, -YT_FEXT.length);

    // Postprocessors, e.g.: "1.temp.mkv".
    const ppName = `${cleanName}.temp${YT_FEXT}`;
    try { fs.unlinkSync(ppName); } catch (e) { /* skip */ }

    // Multi-format downloads, e.g.: "1.mkv.f137", "1.mkv.f251".
    if (afid) {
      const vfName = `${this.sourceName}.f${vfid}`;
      try { fs.unlinkSync(vfName); } catch (e) { /* skip */ }
      const afName = `${this.sourceName}.f${afid}`;
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
    this.abort();
    try { fs.unlinkSync(this.sourceName); } catch (e) { /* skip */ }
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
