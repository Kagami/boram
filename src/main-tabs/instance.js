/**
 * Single tab instance.
 * @module boram/main-tabs/instance
 */

import React from "react";
import {useSheet} from "../jss";
import Source from "../source";
import Info from "../info";
import Encoder from "../encoder";
import ShowHide from "../show-hide";

@useSheet({
  instance: {
    height: "100%",
    textAlign: "center",
  },
})
export default class extends React.PureComponent {
  state = {}
  handleSourceLoad = (source) => {
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
    const {classes} = this.sheet;
    return (
      <div className={classes.instance}>
        <ShowHide show={!this.state.source}>
          <Source
            onLoad={this.handleSourceLoad}
            onTabTitle={this.props.onTabTitle}
          />
        </ShowHide>
        <ShowHide show={!!this.state.source && !this.state.info}>
          <Info
            source={this.state.source}
            onLoad={this.handleInfoLoad}
            onCancel={this.handleSourceClear}
          />
        </ShowHide>
        <ShowHide show={!!this.state.info}>
          <Encoder
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
