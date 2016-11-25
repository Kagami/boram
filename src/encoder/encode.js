/**
 * Encode tab.
 * @module boram/encoder/encode
 */

import assert from "assert";
import {basename, extname} from "path";
import {parse as parseArgs} from "shell-quote";
import {shell, remote} from "electron";
import React from "react";
import Icon from "react-fa";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {
  parseFrameRate, quoteArgs,
  tmp, moveSync,
  fixOpt, clearOpt,
  // showErr,
} from "../util";
import {
  BigProgress, BigButton, Pane, Sep,
} from "../theme";

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
    this.props.events.on("cleanup", () => {
      try {
        this.ff.kill("SIGKILL");
      } catch (e) {
        /* skip */
      }
    });
  }
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
        const did = frame - lastFrame;
        lastFrame = frame;
        return did;
      },
      reset() {
        lastFrame = 0;
      },
    };
  }
  updateProgress({passn, frames, totalFrames}) {
    let inc = frames / totalFrames * 100;
    if (passn) {
      inc *= passn === 1 ? PASS1_COEFF : PASS2_COEFF;
    }
    const progress = Math.min(this.state.progress + inc, 100);
    this.setState({progress});
  }
  start({preview} = {}) {
    /* eslint-disable no-use-before-define */
    const handleLog = (chunk) => {
      // Emulate terminal caret behavior.
      // FIXME(Kagami): Windows \r\n?
      let log = this.state.log.slice(0, curpos);
      chunk = chunk.toString();
      const cr = chunk.lastIndexOf("\r", chunk.length - 2);
      if (cr > -1) {
        log = log.slice(0, lastnl + 1);
        chunk = chunk.slice(cr + 1);
      }
      if (chunk.endsWith("\r")) {
        chunk = chunk.slice(0, -1) + "\n";
        lastnl += chunk.length - 1;
      } else {
        curpos += chunk.length;
        const nl = chunk.lastIndexOf("\n");
        if (nl > -1) {
          lastnl += nl;
        }
      }
      log += chunk;
      this.setState({log});
      const frames = frameParser.feed(chunk);
      this.updateProgress({passn, frames, totalFrames});
    };
    const run = (args) => {
      handleLog(this.showArgs(args));
      this.ff = FFmpeg._run(args, handleLog);
      return this.ff;
    };
    /* eslint-enable no-use-before-define */

    // TODO(Kagami): This won't work with VFR or wrong FPS value. Use
    // the exact number of frames in video after first pass?
    const fps = parseFrameRate(this.props.vtrack.r_frame_rate);
    const totalFrames = Math.ceil(this.props._duration * fps);
    const postfix = preview ? ".mkv" : ".webm";
    const outpath = tmp.fileSync({prefix: "boram-", postfix}).name;
    const output = {path: preview ? null : outpath};
    const passlog = tmp.fileSync({prefix: "boram-", postfix: "-0.log"}).name;
    const frameParser = this.createFrameParser();

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
      this.setState({output, progress: 100});
      this.props.onEncoding(false);
      if (preview) {
        // XXX(Kagami): This blocks window until application quits, see
        // <https://github.com/electron/electron/issues/6889>.
        shell.openItem(outpath);
      }
    }, (encodeError) => {
      this.setState({encodeError, progress: 0});
      this.props.onEncoding(false);
      // handleLog(showErr(encodeError));
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
  handlePreview = () => {
    this.toggleEncode({preview: true});
  };
  handleNewTab = () => {
  };
  toggleEncode = (opts) => {
    const encoding = !this.props.encoding;
    if (encoding) {
      this.setState({progress: 0, log: "", output: null, encodeError: null});
      this.props.onEncoding(encoding);
      this.start(opts);
    } else {
      this.cancel();
    }
  };
  handleSave = () => {
    let defaultPath = this.props.source.path;
    defaultPath = basename(defaultPath, extname(defaultPath));
    defaultPath += ".webm";
    const tmppath = this.state.output.path;
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
              icon={<Icon name="tv" />}
              title="Make fast preview encode and play it"
              disabled={!this.props.allValid || this.props.encoding}
              onClick={this.handlePreview}
            />
            <Sep margin={2.5} />
            <BigButton
              icon={<Icon name="files-o" />}
              title="Open new tab for this source"
              onClick={this.handleNewTab}
            />
            <Sep margin={2.5} />
            <BigButton
              width={85}
              label={this.props.encoding ? "cancel" : "start"}
              title="Start/stop encoding"
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
