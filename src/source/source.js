/**
 * Source form. Returns either ytdl JSON or local file.
 * @module boram/source/source
 */

import {shell, remote} from "electron";
import React from "react";
import cx from "classnames";
import Icon from "react-fa";
import {useSheet} from "../jss";
import YouTubeDL from "../youtube-dl";
import {Tip} from "../theme";
import {showErr} from "../util";

const YTDL_SUPPORTED_URL =
  "https://rg3.github.io/youtube-dl/supportedsites.html";
const COMMON_VIDEO_EXTENSIONS = [
  "mkv", "webm", "mp4", "mov", "avi", "ts", "tp",
];

@useSheet({
  source2: {
    width: 600,
    height: 600,
    marginBottom: 50,
  },
  border: {
    height: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
    border: "2px dashed #ccc",
    color: "#999",
    display: "flex",
    alignItems: "center",
    fontSize: "20px",
    padding: 10,
  },
  borderDisabled: {
    cursor: "not-allowed",
  },
  form: {
    margin: "0 auto",
  },
  input: {
    width: 200,
    fontSize: "20px",
  },
  text: {
    lineHeight: "1.7em",
  },
  padding: {
    minHeight: 104,
  },
  error: {
    color: "red",
    marginTop: 20,
    wordBreak: "break-all",
    cursor: "initial",
    display: "-webkit-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    WebkitLineClamp: 10,
    WebkitBoxOrient: "vertical",
  },
  icon: {
    fontSize: "200px",
    display: "block",
  },
})
export default class extends React.PureComponent {
  state = {url: ""}
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
  }
  abort = () => {
    try { this.ytdl.kill("SIGKILL"); } catch (e) { /* skip */ }
  };
  handleFormClick = () => {
    if (this.state.infoLoading) return;
    if (this.state.infoError) {
      this.handleClearClick();
    } else if (this.state.url) {
      this.handleInfoGet();
    } else {
      const selected = remote.dialog.showOpenDialog({
        filters: [
          {name: "Videos", extensions: COMMON_VIDEO_EXTENSIONS},
          {name: "All files", extensions: ["*"]},
        ],
      });
      if (!selected) return;
      this.props.onSource({path: selected[0]});
    }
  }
  handleFileLoad = () => {
    const file = this.refs.file.files[0];
    this.props.onSource({path: file.path});
  }
  handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files.length) return;
    this.props.onSource({path: files[0].path});
  }
  handleURLClick = (e) => {
    e.stopPropagation();
  }
  handleTextClick = (e) => {
    e.stopPropagation();
  }
  handleURLChange = (e) => {
    this.setState({url: e.target.value});
  }
  handleInfoGet = (e = null) => {
    if (e) e.preventDefault();
    if (!this.state.url) return;
    if (this.state.infoLoading) return;
    this.setState({infoLoading: true});
    this.ytdl = YouTubeDL.getInfo(this.state.url);
    this.ytdl.then(info => {
      this.props.onInfo(info);
    }, err => {
      this.setState({infoLoading: false, infoError: err});
    });
  }
  handleClearClick = () => {
    this.setState({infoError: null, url: ""});
    // We can't focus disabled input and state updates will be flushed
    // only on a next tick. This is a bit hacky.
    this.refs.url.disabled = false;
    this.refs.url.focus();
  }
  handleSupportedClick = (e) => {
    e.preventDefault();
    shell.openExternal(YTDL_SUPPORTED_URL);
  }
  render() {
    const {classes} = this.sheet;
    return (
      <div className={classes.source2}>
        <div
          className={cx(classes.border,
                        this.state.infoLoading && classes.borderDisabled)}
          onDrop={this.handleDrop}
          onClick={this.handleFormClick}
        >
          <form className={classes.form} onSubmit={this.handleInfoGet}>
            <div className={classes.text}>
              <div>Click/drag your source video here</div>
              <span>or </span>
              <input
                autoFocus
                ref="url"
                type="text"
                placeholder="enter URL"
                value={this.state.url}
                className={classes.input}
                onClick={this.handleURLClick}
                onChange={this.handleURLChange}
                disabled={this.state.infoLoading || this.state.infoError}
              />
            </div>
            <div className={classes.padding}>
              <div className={classes.error} onClick={this.handleTextClick}>
                {showErr(this.state.infoError)}
              </div>
            </div>
            <Icon
              ref="icon"
              className={classes.icon}
              name={this.state.infoError
                    ? "remove"
                    : this.state.url ? "external-link" : "folder-open-o"}
              title={this.state.infoError
                     ? "Clear error"
                     : this.state.url
                       ? "Request formats for that URL"
                       : "Open file dialog"}
            />
          </form>
        </div>
        <Tip icon="info-circle">
          <span>Any video </span>
          <a href onClick={this.handleSupportedClick}>
            site supported by youtube-dl
          </a>
          <span> is accepted</span>
        </Tip>
      </div>
    );
  }
}
