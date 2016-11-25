/**
 * Select across available source formats.
 * @module boram/source/format
 */

import assert from "assert";
import React from "react";
import {useSheet} from "../jss";
import {Tip, BigButton, SmallSelect, MenuItem, Sep} from "../theme";
import {showSize} from "../util";

@useSheet({
  format: {
    textAlign: "center",
    marginBottom: 100,
  },
})
export default class extends React.Component {
  state = {
    vfid: this.getVideoFormats()[0].key,
    afid: this.getAudioFormats()[0].key,
  }
  componentDidMount() {
    if (BORAM_DEBUG) {
      if (process.env.BORAM_DEBUG_FORMAT) {
        this.handleDownload();
      }
    }
  }
  // Prefer high-quality.
  compareVideo(a, b) {
    // Higher resolution/FPS is always better.
    if (a.height !== b.height) return b.height - a.height;
    if (a.width !== b.width) return b.width - a.width;
    if (a.fps !== b.fps) return b.fps - a.fps;
    // VP9 at high resolution/FPS is better than H.264.
    if (a.vcodec && b.vcodec) {
      if (a.width > 1920 || a.height > 1080 ||
          ((a.width === 1920 || a.height === 1080) && a.fps > 30)) {
        if (a.vcodec === "vp9" && b.vcodec.startsWith("avc")) {
          return -1;
        } else if (b.vcodec === "vp9" && a.vcodec.startsWith("avc")) {
          return 1;
        }
      }
    }
    // Else prefer by bitrate.
    if (a.tbr !== b.tbr) return b.tbr - a.tbr;
    return 0;
  }
  getVideoText(format) {
    const {vcodec, ext, acodec, width, height, fps, filesize} = format;
    let text = `${(vcodec || ext).replace(/\..+$/, "")}`;
    if (acodec && acodec !== "none") {
      text += `+${acodec.trim().replace(/\..+$/, "")}`;
    }
    text += ` ${width}x${height}`;
    if (fps > 1) text += ` ${fps}fps`;
    if (filesize) text += ` ${showSize(filesize)}`;
    return text;
  }
  getVideoFormats() {
    const formats = this.props.info.formats
      .filter(f => !f.acodec || f.acodec === "none")
      .sort(this.compareVideo)
      .map(f => ({
        key: f.format_id,
        ext: f.ext,
        text: this.getVideoText(f),
      }));
    return formats.length ? formats : [{key: null, text: "none"}];
  }
  compareAudio(a, b) {
    return b.abr - a.abr;
  }
  getAudioText(format) {
    const {acodec, abr, filesize} = format;
    return `${acodec.replace(/\..+$/, "")} ${abr}kbits (${showSize(filesize)})`;
  }
  getAudioFormats() {
    return this.props.info.formats
      .filter(f => f.vcodec === "none")
      .sort(this.compareAudio)
      .map(f => ({
        key: f.format_id,
        text: this.getAudioText(f),
      }))
      .concat({key: null, text: "none"});
  }
  isNoVideo() {
    return this.getVideoFormats().length <= 1;
  }
  isNoAudio() {
    return this.getAudioFormats().length <= 1;
  }
  handleVideoFormatChange = (e, _, vfid) => {
    this.setState({vfid});
  };
  handleAudioFormatChange = (e, _, afid) => {
    this.setState({afid});
  };
  handleDownload = () => {
    const {vfid, afid} = this.state;
    const ext = this.getVideoFormats().find(f => f.key === vfid).ext;
    assert(ext);
    this.props.onLoad({vfid, afid, ext});
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.format}>
        <h2>Video format</h2>
        <SmallSelect
          width={300}
          style={{fontSize: "inherit"}}
          labelStyle={{paddingRight: 24}}
          value={this.state.vfid}
          disabled={this.isNoVideo()}
          onChange={this.handleVideoFormatChange}
        >
        {this.getVideoFormats().map(f =>
          <MenuItem
            key={f.key}
            value={f.key}
            primaryText={f.text}
            style={{fontSize: "inherit"}}
          />
        )}
        </SmallSelect>
        <Sep vertical size={20} />
        <h2>Audio format (optional)</h2>
        <SmallSelect
          width={300}
          style={{fontSize: "inherit"}}
          labelStyle={{paddingRight: 24}}
          value={this.state.afid}
          disabled={this.isNoAudio()}
          onChange={this.handleAudioFormatChange}
        >
        {this.getAudioFormats().map(f =>
          <MenuItem
            key={f.key}
            value={f.key}
            primaryText={f.text}
            style={{fontSize: "inherit"}}
          />
        )}
        </SmallSelect>
        <Sep vertical size={60} />
        <BigButton
          width={300}
          height={40}
          label="Download"
          labelStyle={{fontSize: "inherit"}}
          disabled={this.isNoVideo()}
          onClick={this.handleDownload}
        />
        <Sep vertical />
        <BigButton
          width={300}
          height={40}
          label="back"
          labelStyle={{fontSize: "inherit"}}
          onClick={this.props.onCancel}
        />
        <Tip icon="info-circle">
          <span>Formats with highest resolution/fps are recommended </span>
          <span>(overall quality will be higher).</span><br/>
          <span>You can shrink it later via settings if needed.</span>
        </Tip>
      </div>
    );
  }
}
