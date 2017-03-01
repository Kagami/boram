/**
 * Single tab instance.
 * @module boram/main-tabs/instance
 */

import EventEmitter from "events";
import React from "react";
import Source from "../source";
import Info from "../info";
import Encoder from "../encoder";
import ShowHide from "../show-hide";

export default class extends React.PureComponent {
  state = {info: null};
  events = new EventEmitter();
  abort(quit) {
    this.events.emit("abort", quit);
  }
  handleInfoLoad = (info) => {
    this.setState({info});
  };
  // Can only happen in single case: info component failed to
  // parse/validate provided source.
  handleSourceClear = () => {
    this.props.onTabTitle();
    this.setState({info: null});
    this.props.onSourceUpdate(null);
  };
  render() {
    return (
      <div style={{height: "100%"}}>
        <ShowHide show={!this.props.source}>
          <Source
            events={this.events}
            onLoad={this.props.onSourceUpdate}
            onTabTitle={this.props.onTabTitle}
            onProgress={this.props.onProgress}
          />
        </ShowHide>
        <ShowHide show={!!this.props.source && !this.state.info}>
          <Info
            events={this.events}
            source={this.props.source}
            onLoad={this.handleInfoLoad}
            onCancel={this.handleSourceClear}
          />
        </ShowHide>
        <ShowHide show={!!this.state.info}>
          <Encoder
            events={this.events}
            active={this.props.active}
            source={this.props.source}
            info={this.state.info}
            onTabTitle={this.props.onTabTitle}
            onProgress={this.props.onProgress}
          />
        </ShowHide>
      </div>
    );
  }
}
