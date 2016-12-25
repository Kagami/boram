/**
 * Renderer process entry point.
 * @module boram/index/renderer
 */

import inputMenu from "electron-input-menu";
import context from "electron-contextmenu-middleware";
import React from "react";
import ReactDOM from "react-dom";
import injectTapEventPlugin from "react-tap-event-plugin";
import {useSheet} from "../jss";
import {MuiThemeProvider, BACKGROUND_COLOR} from "../theme";
import MainTabs from "../main-tabs";
import "file!./roboto-light.ttf";
import "file!./roboto-regular.ttf";
import "file!./roboto-medium.ttf";

@useSheet({"@global": {
  body: {
    margin: 0,
    fontSize: "18px",
    backgroundColor: BACKGROUND_COLOR,
  },
  "@font-face": [{
    fontFamily: "'Roboto'",
    fontStyle: "normal",
    fontWeight: "300",
    src: [
      "local('Roboto Light')",
      "local('Roboto-Light')",
      "url(roboto-light.ttf) format('truetype')",
    ],
  }, {
    fontFamily: "'Roboto'",
    fontStyle: "normal",
    fontWeight: "400",
    src: [
      "local('Roboto')",
      "local('Roboto-Regular')",
      "url(roboto-regular.ttf) format('truetype')",
    ],
  }, {
    fontFamily: "'Roboto'",
    fontStyle: "normal",
    fontWeight: "500",
    src: [
      "local('Roboto Medium')",
      "local('Roboto-Medium')",
      "url(roboto-medium.ttf) format('truetype')",
    ],
  }],
  "body, input": {
    fontFamily: "'Roboto', sans-serif",
  },
  "input, select:focus, button:focus, input[type=range]:focus": {
    outline: "none",
  },
  "select:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  "a[href]": {
    color: "#4078c0",
    textDecoration: "none",
  },
  "a[href]:hover": {
    color: "red",
  },
}})
class Index extends React.PureComponent {
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

// See <https://github.com/electron/electron/issues/4068>.
context.use(inputMenu);
context.activate();

// Required for material-ui.
injectTapEventPlugin();

ReactDOM.render(<Index/>, document.querySelector(".boram-index"));
