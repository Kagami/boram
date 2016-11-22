/**
 * Tips widget.
 * @module boram/tip
 */

import React from "react";
import Icon from "react-fa";
import {useSheet} from "../jss";
import {Paper, BACKGROUND_COLOR} from "../theme";

@useSheet({
  icon: {
    display: "inline-block",
    marginRight: 15,
    color: "blue",
  },
})
export default class extends React.Component {
  static styles = {
    tip: {
      position: "fixed",
      left: 50,
      right: 50,
      bottom: 30,
      padding: 10,
      color: "#333",
      backgroundColor: BACKGROUND_COLOR,
    },
  }

  render() {
    const {classes} = this.sheet;
    const styles = this.constructor.styles;
    return (
      <Paper style={styles.tip}>
        <Icon name={this.props.icon} className={classes.icon} />
        {this.props.children}
      </Paper>
    );
  }
}
