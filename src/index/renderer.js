/**
 * Renderer process entry point.
 * @module boram/index/renderer
 */

import React from "react";
import ReactDOM from "react-dom";
import injectTapEventPlugin from "react-tap-event-plugin";
import jss from "../jss";
import {MuiThemeProvider, BACKGROUND_COLOR} from "../theme";
import MainTabs from "../main-tabs";

// Global styles.
jss.createStyleSheet({
  body: {
    margin: 0,
    fontSize: "18px",
    backgroundColor: BACKGROUND_COLOR,
  },
  "body, input": {
    fontFamily: "Roboto, sans-serif",
  },
  "input, select:focus, button:focus": {
    outline: "none",
  },
  "select:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  "input[type=range]:focus": {
    outline: "none",
  },
  "input[type=button]:focus": {
    outline: "none",
  },
  "input[type=button]:disabled": {
    cursor: "auto !important",
  },
  "a[href]": {
    textDecoration: "none",
  },
  "a[href]:hover": {
    color: "red",
  },
}, {named: false}).attach();

class Index extends React.Component {
  componentDidMount() {
    // Prevent default behavior from changing page on dropped file.
    window.ondragover = function(e) { e.preventDefault(); };
    // NOTE: ondrop events WILL NOT WORK if you do not "preventDefault"
    // in the ondragover event!
    window.ondrop = function(e) { e.preventDefault(); };
  }
  render() {
    return <MuiThemeProvider><MainTabs/></MuiThemeProvider>;
  }
}

injectTapEventPlugin();
ReactDOM.render(<Index/>, document.querySelector(".boram-index"));
