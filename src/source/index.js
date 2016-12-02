/**
 * Download source from given URL via ytdl or return local file.
 * @module boram/source
 */

import {basename} from "path";
import React from "react";
import {useSheet} from "../jss";
import Source from "./source";
import Format from "./format";
import Download from "./download";
import ShowHide from "../show-hide";

@useSheet({
  source: {
    display: "flex",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
})
export default class extends React.PureComponent {
  state = {}
  componentWillMount() {
    if (BORAM_DEBUG) {
      let info = process.env.BORAM_DEBUG_INFO;
      const source = process.env.BORAM_DEBUG_SOURCE;
      if (info) {
        info = require("fs").readFileSync(info, {encoding: "utf-8"});
        this.handleInfoLoad(JSON.parse(info));
      } else if (source) {
        this.handleSourcePathLoad({path: require("path").resolve(source)});
      }
    }
  }
  // We set filename only if file was selected. For external sources
  // keep video title.
  handleSourcePathLoad = (source) => {
    this.props.onTabTitle(basename(source.path));
    this.props.onLoad(source);
  }
  handleInfoLoad = (info) => {
    this.props.onTabTitle(info.title);
    this.setState({info});
  }
  handleFormatLoad = (format) => {
    this.setState({format});
  }
  handleCancel = () => {
    this.props.onTabTitle();
    this.setState({info: null, format: null});
  }
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.source}>
        <ShowHide show={!this.state.info}>
          <Source
            events={this.props.events}
            onInfo={this.handleInfoLoad}
            onSource={this.handleSourcePathLoad}
          />
        </ShowHide>
        <ShowHide show={!!this.state.info && !this.state.format}>
          <Format
            info={this.state.info}
            onLoad={this.handleFormatLoad}
            onCancel={this.handleCancel}
          />
        </ShowHide>
        <ShowHide show={!!this.state.format}>
          <Download
            events={this.props.events}
            info={this.state.info}
            format={this.state.format}
            onLoad={this.props.onLoad}
            onCancel={this.handleCancel}
            onProgress={this.props.onProgress}
          />
        </ShowHide>
      </div>
    );
  }
}
