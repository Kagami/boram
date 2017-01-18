/**
 * Encoder info tab.
 * @module boram/encoder/info
 */

import {shell} from "electron";
import React from "react";
import {useSheet} from "../jss";
import {CompactProp as Prop} from "../theme";
import {
  showTime, showBitrate, showSize, showLang,
  parseFrameRate, showFrameRate, parseSAR,
} from "../util";

@useSheet({
  info: {
    display: "flex",
    height: "100%",
  },
  general: {
    width: "50%",
  },
  tracks: {
    width: "50%",
    overflowY: "auto",
  },
  track: {
    marginBottom: 20,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  header: {
    fontWeight: "bold",
  },
})
export default class extends React.PureComponent {
  getLangNode(track) {
    const lang = showLang(track);
    return lang ? <Prop name="language">{lang}</Prop> : null;
  }
  getResolution(track) {
    const {width, height, sample_aspect_ratio} = track;
    const sar = parseSAR(sample_aspect_ratio);
    let dwidth = width;
    let dheight = height;
    if (sar > 1) {
      dwidth = Math.round(dwidth * sar);
    } else if (sar < 1) {
      dheight = Math.round(dheight * sar);
    }
    if (sar === 1) {
      return `${width}x${height}`;
    } else {
      return `${dwidth}x${dheight} (coded ${width}x${height})`;
    }
  }
  getTrackNode(track, i) {
    const {classes} = this.sheet;
    switch (track.codec_type) {
    case "video":
      return (
        <div key={track.index} className={classes.track}>
          <div className={classes.header}>Video #{i}</div>
          <Prop name="codec">{track.codec_name}</Prop>
          <Prop name="resolution">{this.getResolution(track)}</Prop>
          <Prop name="frame rate">
            {showFrameRate(parseFrameRate(track.avg_frame_rate))}
          </Prop>
          <Prop name="pixel format">{track.pix_fmt}</Prop>
        </div>
      );
    case "audio":
      return (
        <div key={track.index} className={classes.track}>
          <div className={classes.header}>Audio #{i}</div>
          <Prop name="codec">{track.codec_name}</Prop>
          <Prop name="channels">{track.channels} ({track.channel_layout})</Prop>
          {this.getLangNode(track)}
        </div>
      );
    case "subtitle":
      return (
        <div key={track.index} className={classes.track}>
          <div className={classes.header}>Subtitle #{i}</div>
          <Prop name="codec">{track.codec_name}</Prop>
          {this.getLangNode(track)}
        </div>
      );
    default:
      throw new Error("Unknown codec_type");
    }
  }
  handleOpen = () => {
    shell.openItem(this.props.source.path);
  };
  handleOpenFolder = () => {
    shell.showItemInFolder(this.props.source.path);
  };
  render() {
    const {classes} = this.sheet;
    const {source, format} = this.props;
    return (
      <div className={classes.info}>
        <div className={classes.general}>
          <Prop name="path">
            <span
              style={{cursor: "pointer"}}
              title="Click to play, right-click to open directory"
              onClick={this.handleOpen}
              onContextMenu={this.handleOpenFolder}
            >
              {source.path}
            </span>
          </Prop>
          <Prop name="file size">{showSize(+format.size)}</Prop>
          <Prop name="duration">{showTime(+format.duration)}</Prop>
          <Prop name="bitrate">{showBitrate(+format.bit_rate)}</Prop>
          <Prop name="container">{format.format_long_name}</Prop>
        </div>
        <div className={classes.tracks}>
          {this.props.vtracks.map(this.getTrackNode.bind(this))}
          {this.props.atracks.map(this.getTrackNode.bind(this))}
          {this.props.stracks.map(this.getTrackNode.bind(this))}
        </div>
      </div>
    );
  }
}
