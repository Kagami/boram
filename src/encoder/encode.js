/**
 * Encode tab.
 * @module boram/encoder/encode
 */

import fs from "fs";
import path from "path";
import {shell, remote} from "electron";
import React from "react";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {BigProgress, BigButton, Pane, Sep} from "../theme";
import {
  tmp, parseFrameRate, parseArgs,
  showSize, showBitrate, showTime, quoteArgs,
} from "../util";

@useSheet({
  output: {
    boxSizing: "border-box",
    height: "100%",
    margin: 0,
    padding: 8,
    border: "2px solid #ccc",
    overflowY: "scroll",
    fontSize: "14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    color: "#333",
    backgroundColor: "#f8f8f8",
  },
})
class Output extends React.PureComponent {
  componentDidMount() {
    this.scrollToEnd();
  }
  componentWillUpdate() {
    const {scrollHeight, scrollTop, clientHeight} = this.refs.out;
    this.atEnd = scrollHeight - scrollTop <= clientHeight;
  }
  componentDidUpdate() {
    this.scrollToEnd();
  }

  atEnd = true;
  scrollToEnd() {
    if (this.atEnd) {
      this.refs.out.scrollTop = this.refs.out.scrollHeight;
    }
  }

  handleClear = () => {
    window.getSelection().removeAllRanges();
    this.props.onClear();
  };
  handleSelectAll = () => {
    // https://stackoverflow.com/a/23255927
    const range = document.createRange();
    range.selectNodeContents(this.refs.out);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };
  menu = remote.Menu.buildFromTemplate([
    {label: "Clear", click: this.handleClear},
    {label: "Copy", role: "copy"},
    {type: "separator"},
    {label: "Select all", click: this.handleSelectAll},
  ]);
  handleMenu = () => {
    this.menu.popup();
  };

  render() {
    const {classes} = this.sheet;
    return (
      <pre ref="out" className={classes.output} onContextMenu={this.handleMenu}>
        {this.props.value}
      </pre>
    );
  }
}

// Approximate correlations between various encoding stages.
const PASS1_COEFF = 0.3;
const PASS2_COEFF = 1 - PASS1_COEFF;

export default class extends React.PureComponent {
  static styles = {
    output: {
      overflow: "hidden",
    },
  };
  state = {progress: 0, log: "", output: null, target: this.getDefaultTarget()};
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
    this.tmpLogName = tmp.tmpNameSync({prefix: "boram-", postfix: "-0.log"});
    this.tmpPreviewName = tmp.tmpNameSync({prefix: "boram-", postfix: ".mkv"});
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
    this.cleanup();
  }
  cleanup() {
    try { fs.unlinkSync(this.tmpLogName); } catch (e) { /* skip */ }
    try { fs.unlinkSync(this.tmpPreviewName); } catch (e) { /* skip */ }
  }
  abort = () => {
    this.cancel();
    this.cleanup();
  };
  createFrameParser() {
    const frameRe = /^frame=\s*(\d+)\b/;
    let lastFrame = 0;
    return {
      feed(line) {
        const framem = line.match(frameRe);
        if (!framem) return 0;
        const frame = framem[1];
        const did = Math.max(0, frame - lastFrame);
        lastFrame = frame;
        return did;
      },
      reset() {
        lastFrame = 0;
      },
    };
  }
  start({preview}) {
    /* eslint-disable no-use-before-define */
    const updateProgress = (frames) => {
      let inc = frames / totalFrames * 100;
      if (passn) {
        inc *= passn === 1 ? PASS1_COEFF : PASS2_COEFF;
      }
      progress = Math.min(progress + inc, 99);
      this.setState({progress});
      this.props.onProgress(progress);
    };
    const handleLog = (chunk) => {
      // Emulate terminal caret behavior.
      log = log.slice(0, curpos);
      chunk = chunk.toString();
      // console.log("@@@ IN", JSON.stringify(chunk));
      if (BORAM_WIN_BUILD) {
        chunk = chunk.replace(/\r\n/g, "\n");
      }

      for (;;) {
        const cr = chunk.indexOf("\r");
        if (cr < 0 || cr > chunk.length - 2) break;
        const sub = chunk.slice(0, cr);
        const nl = sub.lastIndexOf("\n");
        if (nl > -1) {
          log += sub.slice(0, nl + 1);
          lastnl = log.length - 1;
        } else {
          log = log.slice(0, lastnl + 1);
        }
        chunk = chunk.slice(cr + 1);
      }

      const nl = chunk.lastIndexOf("\n");
      if (nl > -1) {
        lastnl = log.length + nl;
      }

      // TODO(Kagami): Implement chunk1="...\r" chunk2="\n..." special
      // case. On Windows this should be a newline.
      if (chunk.endsWith("\r")) {
        // Log will be cut on next call.
        chunk = chunk.slice(0, -1) + "\n";
        log += chunk;
        curpos = lastnl + 1;
      } else {
        log += chunk;
        curpos = log.length;
      }

      this.setState({log});
      if (encoding) {
        // TODO(Kagami): Feed every line?
        updateProgress(frameParser.feed(chunk));
      }
    };
    const run = (args) => {
      handleLog(this.showArgs(args));
      this.ff = FFmpeg._run(args, handleLog);
      return this.ff;
    };
    /* eslint-enable no-use-before-define */

    // TODO(Kagami): This won't work with VFR or wrong FPS value. Use
    // the exact number of frames in video after first pass?
    const fps = parseFrameRate(this.props.vtrack.avg_frame_rate);
    const totalFrames = Math.ceil(this.props._duration * fps);
    const passlog = this.tmpLogName;
    const outpath = preview ? this.tmpPreviewName : this.state.target;
    const output = {preview, path: outpath};
    const baseArgs = parseArgs(this.props.rawArgs);
    const frameParser = this.createFrameParser();
    const startTime = this.now();

    // progress/log might be updated several times at one go so we need
    // to keep our local reference in addition to state's.
    let progress = 0;
    let log = "";
    let curpos = 0;
    let lastnl = 0;
    let passn = (this.props.mode2Pass && !preview) ? 1 : 0;
    let encoding = true;
    let videop = preview
      ? run(FFmpeg.getPreviewArgs({baseArgs, outpath}))
      : run(FFmpeg.getEncodeArgs({baseArgs, outpath, passlog, passn}));
    if (this.props.mode2Pass && !preview) {
      videop = videop.then(() => {
        frameParser.reset();
        passn = 2;
        handleLog(this.sep() + "\n");
        return run(FFmpeg.getEncodeArgs({baseArgs, outpath, passlog, passn}));
      });
    }
    videop.then(() => {
      progress = 100;
      encoding = false;
      this.setState({output, progress});
      this.props.onProgress(progress);
      this.props.onEncoding(encoding);
      if (preview) {
        this.handleOpen();
      } else {
        handleLog(this.showStats(startTime));
      }
    }, ({code, signal}) => {
      progress = 0;
      encoding = false;
      this.setState({progress});
      this.props.onProgress(progress);
      this.props.onEncoding(encoding);
      const msg = code == null ? `killed by ${signal}`
                               : `exited with ${code}`;
      handleLog(`\nffmpeg ${msg}\n`);
    });
  }
  cancel() {
    // `start` will fail into error state automatically.
    try {
      // No need to wait for graceful exit on TERM.
      // We just want it to stop.
      this.ff.kill("SIGKILL");
    } catch (e) {
      /* skip */
    }
  }
  now() {
    return (new Date()).getTime() / 1000;
  }
  sep() {
    return Array(51).join("=");
  }
  showArgs(args) {
    return `$ ffmpeg ${quoteArgs(args)}\n`;
  }
  showStats(startTime) {
    const {size} = fs.statSync(this.state.output.path);
    const runTime = this.now() - startTime;
    return [
      this.sep(),
      `Output path: ${this.state.output.path}`,
      `Output duration: ${showTime(this.props._duration)}`,
      `Output bitrate: ${showBitrate(size / this.props._duration)}`,
      `Output file size: ${showSize(size)}`,
      `Overall time spent: ${showTime(runTime)}`,
      "",
    ].join("\n");
  }
  isPreviewEncoding() {
    return this.props.encoding && this.state.preview;
  }
  isNormalEncoding() {
    return this.props.encoding && !this.state.preview;
  }
  getDefaultTarget() {
    const dir = remote.app.getPath("desktop");
    const bareName = path
      .parse(this.props.source.saveAs || this.props.source.path)
      .name;

    let index = 0;
    let target = null;
    do {
      const suffix = `-${index}`;
      const name = `${bareName}${index ? suffix : ""}.webm`;
      target = path.join(dir, name);
      index += 1;
    } while (fs.existsSync(target));
    return target;
  }
  toggleEncode({preview}) {
    const encoding = !this.props.encoding;
    if (encoding) {
      this.clearState();
      this.setState({preview});
      this.props.onEncoding(encoding);
      this.start({preview});
    } else {
      this.cancel();
    }
  }
  clearState = () => {
    this.setState({progress: 0, log: "", output: null});
  };
  handlePreviewToggle = () => {
    this.toggleEncode({preview: true});
  };
  handleNormalToggle = () => {
    this.toggleEncode({preview: false});
  };
  handleOpen = () => {
    shell.openItem(this.state.output.path);
  };
  handleOpenFolder = () => {
    // <button disabled> doesn't block contextmenu.
    if (!this.state.output) return;
    shell.showItemInFolder(this.state.output.path);
  };
  handleSelectTarget = () => {
    const target = remote.dialog.showSaveDialog({
      title: "Select destination path",
      defaultPath: this.state.target,
      filters: [
        {name: "WebM", extensions: ["webm"]},
      ],
    });
    if (!target) return;
    this.setState({target});
  };
  render() {
    const {styles} = this.constructor;
    return (
      <Pane vertical space={5} style2={styles.output}>
        <Pane space={5}>
          <div>
            <BigButton
              width={85}
              label="path"
              title="Select destination path"
              disabled={this.props.encoding}
              onClick={this.handleSelectTarget}
            />
            <Sep margin={2.5} />
            <BigButton
              width={85}
              label={this.isPreviewEncoding() ? "cancel" : "preview"}
              title="Make preview encode"
              disabled={!this.props.allValid || this.isNormalEncoding()}
              onClick={this.handlePreviewToggle}
            />
            <Sep margin={2.5} />
            <BigButton
              width={85}
              label={this.isNormalEncoding() ? "cancel" : "normal"}
              title="Make normal encode"
              disabled={!this.props.allValid || this.isPreviewEncoding()}
              onClick={this.handleNormalToggle}
            />
            <Sep margin={2.5} />
            <BigButton
              width={85}
              label="open"
              title="Click to play, right-click to open directory"
              disabled={!this.state.output}
              onClick={this.handleOpen}
              onContextMenu={this.handleOpenFolder}
            />
          </div>
          <BigProgress value={this.state.progress} />
        </Pane>
        <Output
          onClear={this.clearState}
          value={this.state.log ||
                 (this.props.allValid
                   ? `Ready to start.\nSaving to ${this.state.target}`
                   : "Fix invalid settings.")}
        />
      </Pane>
    );
  }
}
