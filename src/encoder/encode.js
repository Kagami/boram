/**
 * Encode tab.
 * @module boram/encoder/encode
 */

import assert from "assert";
import fs from "fs";
import {basename, extname} from "path";
import {parse as parseArgs} from "shell-quote";
import {shell, remote} from "electron";
import React from "react";
import Icon from "react-fa";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {BigProgress, BigButton, Pane, Sep} from "../theme";
import {
  parseFrameRate, quoteArgs,
  tmp, moveSync,
  fixOpt, clearOpt,
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
    this.cleanPreview();
  }
  cleanPreview = () => {
    try { fs.unlinkSync(this.tmpPreviewName); } catch (e) { /* skip */ }
  };
  abort = () => {
    this.cancel();
    this.cleanup();
  };
  getOutput() {
    return (this.props.encoding || this.state.output || this.state.encodeError)
      ? this.state.log
      : this.props.allValid
        ? "Ready to start."
        : "Fix invalid settings.";
  }
  /** Fixed arguments being passed to FFmpeg. */
  getCommonArgs() {
    // TODO(Kagami): shell-quote doesn't throw on unmatched quotes and
    // also parses things like stream redirections and pipes which we
    // don't need. Use some better parser.
    const args = parseArgs(this.props.rawArgs)
      .filter(arg => typeof arg === "string");
    args.unshift("-hide_banner", "-nostdin", "-y");
    return args;
  }
  getPreviewArgs({outpath}) {
    const args = this.getCommonArgs();
    fixOpt(args, "-c:v", "libx264");
    fixOpt(args, "-crf", "18", {add: true});
    // Not needed or libvpx-specific.
    clearOpt(args, [
      "-b:v",
      "-speed",
      "-tile-columns",
      "-frame-parallel",
      "-auto-alt-ref",
      "-lag-in-frames",
      "-g",
    ]);
    args.push("-preset", "ultrafast");
    args.push("-f", "matroska", "--", outpath);
    return args;
  }
  getEncodeArgs({passn, passlog, outpath}) {
    const args = this.getCommonArgs();
    if (passn === 1) {
      // <http://wiki.webmproject.org/ffmpeg/vp9-encoding-guide>.
      fixOpt(args, "-speed", "4");
      // Should be without suffix.
      passlog = passlog.slice(0, -6);
      args.push("-an", "-pass", "1", "-passlogfile", passlog);
      args.push("-f", "null", "-");
    } else if (passn === 2) {
      passlog = passlog.slice(0, -6);
      args.push("-pass", "2", "-passlogfile", passlog);
      args.push("-f", "webm", "--", outpath);
    } else if (passn === 0) {
      args.push("-f", "webm", "--", outpath);
    } else {
      assert(false);
    }
    return args;
  }
  showArgs(args) {
    return `$ ffmpeg ${quoteArgs(args)}\n`;
  }
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
  start({preview} = {}) {
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
      // FIXME(Kagami): Windows \r\n?
      log = log.slice(0, curpos);
      chunk = chunk.toString();
      // console.log("@@@ IN", JSON.stringify(chunk));

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
    const outpath = preview ? this.tmpPreviewName : this.tmpEncodeName;
    const output = {path: preview ? null : outpath};
    const frameParser = this.createFrameParser();

    // progress/log might be updated several times at one go so we need
    // to keep our local reference in addition to state's.
    let progress = 0;
    let log = "";
    let curpos = 0;
    let lastnl = 0;
    let passn = (this.props.mode2Pass && !preview) ? 1 : 0;
    let videop = preview ? run(this.getPreviewArgs({outpath}))
                         : run(this.getEncodeArgs({outpath, passlog, passn}));
    if (this.props.mode2Pass && !preview) {
      videop = videop.then(() => {
        frameParser.reset();
        passn = 2;
        return run(this.getEncodeArgs({outpath, passlog, passn}));
      });
    }
    videop.then(() => {
      progress = 100;
      this.setState({output, progress});
      this.props.onEncoding(false);
      if (preview) {
        // XXX(Kagami): This blocks event loop until application quits,
        // see <https://github.com/electron/electron/issues/6889>. If
        // that behavior will change don't forget about `cleanPreview`
        // which is currently synchronous too.
        shell.openItem(outpath);
      }
    }, (encodeError) => {
      progress = 0;
      this.setState({encodeError, progress});
      this.props.onEncoding(false);
    // Don't needed anymore, save some space.
    }).then(this.cleanPreview, this.cleanPreview);
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
  handlePreview = () => {
    this.toggleEncode({preview: true});
  };
  handleCloneTab = () => {
    const {source} = this.props;
    this.props.onNewTab({source});
  };
  toggleEncode = (opts) => {
    const encoding = !this.props.encoding;
    if (encoding) {
      this.setState({output: null, encodeError: null});
      this.props.onEncoding(encoding);
      this.start(opts);
    } else {
      const choice = remote.dialog.showMessageBox({
        title: "Confirm",
        message: "Abort encoding?",
        buttons: ["OK", "Cancel"],
      });
      if (choice !== 0) return;
      this.cancel();
    }
  };
  handleSave = () => {
    let defaultPath = this.props.source.path;
    defaultPath = basename(defaultPath, extname(defaultPath));
    defaultPath += ".webm";
    const tmppath = this.state.output.path;
    // TODO(Kagami): Check for the same path?
    const outpath = remote.dialog.showSaveDialog({defaultPath});
    if (!outpath) return;
    try {
      moveSync(tmppath, outpath);
    } catch (encodeError) {
      this.setState({encodeError});
    }
  };
  render() {
    const {styles} = this.constructor;
    return (
      <Pane vertical space={5} style2={styles.output}>
        <Pane space={5}>
          <div>
            <BigButton
              icon={<Icon name="files-o" />}
              title="Open new tab for this source"
              onClick={this.handleCloneTab}
            />
            <Sep margin={2.5} />
            <BigButton
              icon={<Icon name="tv" />}
              title="Make preview encode"
              disabled={!this.props.allValid || this.props.encoding}
              onClick={this.handlePreview}
            />
            <Sep margin={2.5} />
            <BigButton
              width={85}
              label={this.props.encoding ? "cancel" : "start"}
              title="Start/cancel encoding"
              disabled={!this.props.allValid}
              onClick={this.toggleEncode}
            />
            <Sep margin={2.5} />
            <BigButton
              width={85}
              label="save"
              title="Save result"
              disabled={!this.state.output || !this.state.output.path}
              onClick={this.handleSave}
            />
          </div>
          <BigProgress value={this.state.progress} />
        </Pane>
        <Output value={this.getOutput()} />
      </Pane>
    );
  }
}
