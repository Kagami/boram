/**
 * Encode tab.
 * @module boram/encoder/encode
 */

import fs from "fs";
import path from "path";
import {parse as parseArgs} from "shell-quote";
import {shell, remote} from "electron";
import React from "react";
import Icon from "react-fa";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {BigProgress, BigButton, Pane, Sep} from "../theme";
import {tmp, moveSync, parseFrameRate} from "../util";

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
    wordWrap: "break-word",
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
  render() {
    const {classes} = this.sheet;
    return <pre ref="out" className={classes.output}>{this.props.value}</pre>;
  }
}

// Approximate correlations between various encoding stages.
const PASS1_COEFF = 0.4;
const PASS2_COEFF = 1 - PASS1_COEFF;

export default class extends React.PureComponent {
  static styles = {
    output: {
      overflow: "hidden",
    },
  }
  state = {progress: 0, log: ""}
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
    this.tmpLogName = tmp.tmpNameSync({prefix: "boram-", postfix: "-0.log"});
    this.tmpEncodeName = tmp.tmpNameSync({prefix: "boram-", postfix: ".webm"});
    this.tmpPreviewName = tmp.tmpNameSync({prefix: "boram-", postfix: ".mkv"});
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
    this.cleanup();
  }
  cleanup() {
    try { fs.unlinkSync(this.tmpLogName); } catch (e) { /* skip */ }
    try { fs.unlinkSync(this.tmpEncodeName); } catch (e) { /* skip */ }
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
      // TODO(Kagami): Feed every line?
      updateProgress(frameParser.feed(chunk));
    };
    const run = (args) => {
      handleLog(FFmpeg.showArgs(args));
      this.ff = FFmpeg._run(args, handleLog);
      return this.ff;
    };
    /* eslint-enable no-use-before-define */

    // TODO(Kagami): This won't work with VFR or wrong FPS value. Use
    // the exact number of frames in video after first pass?
    const fps = parseFrameRate(this.props.vtrack.avg_frame_rate);
    const totalFrames = Math.ceil(this.props._duration * fps);
    const passlog = this.tmpLogName;
    const outpath = preview ? this.tmpPreviewName : this.tmpEncodeName;
    const output = {preview, path: outpath};
    const frameParser = this.createFrameParser();
    // TODO(Kagami): shell-quote doesn't throw on unmatched quotes and
    // also parses things like stream redirections and pipes which we
    // don't need. Use some better parser.
    const rawArgs = parseArgs(this.props.rawArgs);

    // progress/log might be updated several times at one go so we need
    // to keep our local reference in addition to state's.
    let progress = 0;
    let log = "";
    let curpos = 0;
    let lastnl = 0;
    let passn = (this.props.mode2Pass && !preview) ? 1 : 0;
    let videop = preview
      ? run(FFmpeg.getPreviewArgs({rawArgs, outpath}))
      : run(FFmpeg.getEncodeArgs({rawArgs, outpath, passlog, passn}));
    if (this.props.mode2Pass && !preview) {
      videop = videop.then(() => {
        frameParser.reset();
        passn = 2;
        return run(FFmpeg.getEncodeArgs({rawArgs, outpath, passlog, passn}));
      });
    }
    videop.then(() => {
      progress = 100;
      this.setState({output, progress});
      this.props.onEncoding(false);
      if (preview) {
        this.handlePlay();
      }
    }, (encodeError) => {
      progress = 0;
      this.setState({encodeError, progress});
      this.props.onEncoding(false);
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
  isPreviewEncoding() {
    return this.props.encoding && this.state.preview;
  }
  isNormalEncoding() {
    return this.props.encoding && !this.state.preview;
  }
  toggleEncode({preview}) {
    const encoding = !this.props.encoding;
    if (encoding) {
      this.setState({preview, output: null, encodeError: null});
      this.props.onEncoding(encoding);
      this.start({preview});
    } else {
      this.cancel();
    }
  }
  handlePreviewToggle = () => {
    this.toggleEncode({preview: true});
  };
  handleNormalToggle = () => {
    this.toggleEncode({preview: false});
  };
  handlePlay = () => {
    shell.openItem(this.state.output.path);
  };
  handleSave = () => {
    let defaultPath = this.props.source.saveAs ||
                      `${path.parse(this.props.source.path).name}.webm`;
    const tmppath = this.state.output.path;
    const outpath = remote.dialog.showSaveDialog({
      defaultPath,
      filters: [
        {name: "WebM", extensions: ["webm"]},
      ],
    });
    if (!outpath) return;
    try {
      // rename(2) returns success on Linux for the same path so no need
      // to bother with additional checkings. The worse thing is that
      // user may overwrite current source but we can't prevent this on
      // OS level.
      moveSync(tmppath, outpath);
    } catch (encodeError) {
      this.setState({encodeError});
    }
    // Encoded file is moved.
    const output = {path: outpath};
    this.setState({output});
  };
  render() {
    const {styles} = this.constructor;
    return (
      <Pane vertical space={5} style2={styles.output}>
        <Pane space={5}>
          <div>
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
              icon={<Icon name="tv" />}
              title="Play result"
              disabled={!this.state.output}
              onClick={this.handlePlay}
            />
            <Sep margin={2.5} />
            <BigButton
              icon={<Icon name="save" />}
              title="Save result"
              disabled={!this.state.output || this.state.output.preview}
              onClick={this.handleSave}
            />
          </div>
          <BigProgress value={this.state.progress} />
        </Pane>
        <Output
          value={this.state.log ||
                 (this.props.allValid
                   ? "Ready to start."
                   : "Fix invalid settings.")}
        />
      </Pane>
    );
  }
}
