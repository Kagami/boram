/**
 * Select across available source formats.
 * @module boram/source/format
 */

import React from "react";
import {useSheet} from "../jss";
import {Tip, BigButton, SmallSelect, MenuItem, Sep} from "../theme";
import {showSize} from "../util";

@useSheet({
  format: {
    marginBottom: 100,
  },
  header: {
    margin: 0,
    marginRight: 24,  // Compensate for SelectField icon
    marginBottom: 20,
  },
})
export default class extends React.PureComponent {
  state = {
    vfid: this.getVideoFormats()[0].key,
    afid: this.getAudioFormats()[0].key,
    sfid: this.getDefaultSubID(),
  };
  componentDidMount() {
    if (BORAM_DEBUG) {
      if (process.env.BORAM_DEBUG_FORMAT) {
        this.handleDownload();
      }
    }
  }

  // Prefer high-quality.
  compareVideoFormats(a, b) {
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
    if (width && height) text += ` ${width}x${height}`;
    if (fps > 1) text += ` ${fps}fps`;
    if (filesize) text += ` (${showSize(filesize, {tight: true})})`;
    return text;
  }
  getVideoFormats() {
    const formats = this.props.info.formats
      .filter(f => !f.acodec || f.vcodec !== "none")
      .sort(this.compareVideoFormats)
      .map(f => ({
        key: f.format_id,
        text: this.getVideoText(f),
      }));
    return formats.length ? formats : [{key: null, text: "none"}];
  }

  compareAudioFormats(a, b) {
    return b.abr - a.abr;
  }
  getAudioText(format) {
    const {acodec, abr, filesize} = format;
    let text = `${acodec.replace(/\..+$/, "")} ${abr}kbits`;
    if (filesize) text += ` (${showSize(filesize, {tight: true})})`;
    return text;
  }
  getAudioFormats() {
    return this.props.info.formats
      .filter(f => f.vcodec === "none")
      .sort(this.compareAudioFormats)
      .map(f => ({
        key: f.format_id,
        text: this.getAudioText(f),
      }))
      .concat({key: null, text: "none"});
  }

  getDefaultSubID() {
    const engIDs = ["en", "eng", "en_US", "en-US"];
    const f = this.getSubFormats().find(f => engIDs.includes(f.key));
    return f ? f.key : this.getSubFormats()[0].key;
  }
  getSubText(format, lang) {
    return `${format.ext} (${lang})`;
  }
  getSubFormats() {
    // ytdl automatically selects format across available subtitles
    // (e.g. it selects vtt across ttml and vtt on youtube). We hope
    // selected format is always appropriate because we can't
    // distinguish multiple formats with same ID.
    const requestedFormats = this.props.info.requested_subtitles || {};
    return Object.keys(requestedFormats)
      // Just lexical sorting, we prefer english only for initial select.
      .sort()
      .map(id => {
        const f = requestedFormats[id];
        return {
          key: id,
          ext: f.ext,
          text: this.getSubText(f, id),
        };
      })
      .concat({key: null, text: "none"});
  }

  isNoVideo() {
    const formats = this.getVideoFormats();
    return formats.length === 1 && formats[0].key == null;
  }
  isNoAudio() {
    const formats = this.getAudioFormats();
    return formats.length === 1 && formats[0].key == null;
  }
  isNoSub() {
    const formats = this.getSubFormats();
    return formats.length === 1 && formats[0].key == null;
  }
  handleVideoFormatChange = (e, _, vfid) => {
    this.setState({vfid});
  };
  handleAudioFormatChange = (e, _, afid) => {
    this.setState({afid});
  };
  handleSubFormatChange = (e, _, sfid) => {
    this.setState({sfid});
  };
  handleDownload = () => {
    const {vfid, afid, sfid} = this.state;
    const sext = this.getSubFormats().find(f => f.key === sfid).ext;
    this.props.onLoad({vfid, afid, sfid, sext});
  };
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.format}>
        <h2 className={classes.header}>Video format</h2>
        <SmallSelect
          width={300}
          style={{fontSize: "16px"}}
          value={this.state.vfid}
          disabled={this.isNoVideo()}
          onChange={this.handleVideoFormatChange}
        >
        {this.getVideoFormats().map(f =>
          <MenuItem
            key={f.key}
            value={f.key}
            primaryText={f.text}
            style={{fontSize: "16px"}}
          />
        )}
        </SmallSelect>
        <Sep vertical size={20} />
        <h2 className={classes.header}>Audio format</h2>
        <SmallSelect
          width={300}
          style={{fontSize: "16px"}}
          value={this.state.afid}
          disabled={this.isNoAudio()}
          onChange={this.handleAudioFormatChange}
        >
        {this.getAudioFormats().map(f =>
          <MenuItem
            key={f.key}
            value={f.key}
            primaryText={f.text}
            style={{fontSize: "16px"}}
          />
        )}
        </SmallSelect>
        <Sep vertical size={20} />
        <h2 className={classes.header}>Subtitles</h2>
        <SmallSelect
          width={300}
          style={{fontSize: "16px"}}
          value={this.state.sfid}
          disabled={this.isNoSub()}
          onChange={this.handleSubFormatChange}
        >
        {this.getSubFormats().map(f =>
          <MenuItem
            key={f.key}
            value={f.key}
            primaryText={f.text}
            style={{fontSize: "16px"}}
          />
        )}
        </SmallSelect>
        <Sep vertical size={60} />
        <BigButton
          width={260}
          height={40}
          label="download"
          labelStyle={{fontSize: "inherit"}}
          disabled={this.isNoVideo()}
          onClick={this.handleDownload}
        />
        <Sep vertical />
        <BigButton
          width={260}
          height={40}
          label="back"
          labelStyle={{fontSize: "inherit"}}
          onClick={this.props.onCancel}
        />
        <Tip icon="info-circle">
          <span>Formats with highest resolution/fps are recommended </span>
          <span>(overall quality will be better).</span><br/>
          <span>You can shrink them on encoding if needed.</span>
        </Tip>
      </div>
    );
  }
}
