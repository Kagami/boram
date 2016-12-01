/**
 * Single tab instance.
 * @module boram/main-tabs/instance
 */

import {basename} from "path";
import EventEmitter from "events";
import React from "react";
import Source from "../source";
import Info from "../info";
import Encoder from "../encoder";
import ShowHide from "../show-hide";

export default class extends React.PureComponent {
  state = {source: null}
  componentWillMount() {
    const {source} = this.props;
    if (source) {
      this.props.onTabTitle(basename(source.path));
      this.handleSourceLoad(source);
    }
  }
  events = new EventEmitter()
  abort() {
    this.events.emit("abort");
  }
  getSource() {
    return this.state.source;
  }
  handleSourceLoad = (source) => {
    this.setState({source}, this.props.onSourceUpdate);
  }
  handleInfoLoad = (info) => {
    this.setState({info});
  }
  // Can only happen in single case: info component failed to
  // parse/validate provided source.
  handleSourceClear = () => {
    this.props.onTabTitle();
    this.setState({source: null, info: null}, this.props.onSourceUpdate);
  }
  render() {
    return (
      <div style={{height: "100%"}}>
        <ShowHide show={!this.state.source}>
          <Source
            events={this.events}
            onLoad={this.handleSourceLoad}
            onTabTitle={this.props.onTabTitle}
          />
        </ShowHide>
        <ShowHide show={!!this.state.source && !this.state.info}>
          <Info
            events={this.events}
            source={this.state.source}
            onLoad={this.handleInfoLoad}
            onCancel={this.handleSourceClear}
          />
        </ShowHide>
        <ShowHide show={!!this.state.info}>
          <Encoder
            events={this.events}
            active={this.props.active}
            source={this.state.source}
            info={this.state.info}
            onTabTitle={this.props.onTabTitle}
          />
        </ShowHide>
      </div>
    );
  }
}
