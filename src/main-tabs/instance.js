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
      this.handleSourceLoad(source);
    }
  }
  events = new EventEmitter()
  abort() {
    this.events.emit("abort");
  }
  handleSourceLoad = (source) => {
    this.props.onTabTitle(basename(source.path));
    this.setState({source});
  }
  handleInfoLoad = (info) => {
    this.setState({info});
  }
  handleSourceClear = () => {
    this.props.onTabTitle();
    this.setState({source: null, info: null});
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
            onNewTab={this.props.onNewTab}
          />
        </ShowHide>
      </div>
    );
  }
}
