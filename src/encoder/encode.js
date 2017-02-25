/**
 * Encode tab.
 * @module boram/encoder/encode
 */

import fs from "fs";
import path from "path";
import {shell, remote} from "electron";
import tmp from "tmp";
import React from "react";
import FFmpeg from "../ffmpeg";
import {useSheet} from "../jss";
import {
  Prop, Pane, Sep,
  BigButton, SmallButton, Icon,
  SmallInput,
  BigProgress,
} from "../theme";
import {
  parseFrameRate, parseArgs,
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
    outline: "none",
  },
})
class Output extends React.PureComponent {
  componentDidMount() {
    this.scrollToEnd();
  }
  componentWillUpdate(nextProps) {
    const {scrollHeight, scrollTop, clientHeight} = this.refs.out;
    this.atEnd = scrollHeight - scrollTop <= clientHeight;
    this.menu.items[0].enabled = !nextProps.encoding;
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
    // <https://stackoverflow.com/a/23255927>.
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
  handleKey = (e) => {
    // From electron-input-menu.
    const DOM_VK_C = 0x43;  // (67) "C" key
    const c = e.keyCode;
    const ctrlDown = e.ctrlKey || e.metaKey;  // OSX support
    const altDown = e.altKey;
    const shiftDown = e.shiftKey;
    if (ctrlDown && !altDown && !shiftDown && c === DOM_VK_C) {
      e.nativeEvent.stopImmediatePropagation();
      remote.getCurrentWindow().webContents.copy();
    }
  };

  render() {
    const {classes} = this.sheet;
    return (
      <pre
        ref="out"
        tabIndex="1"
        className={classes.output}
        onContextMenu={this.handleMenu}
        onKeyDown={this.handleKey}
      >
        {this.props.value}
      </pre>
    );
  }
}

// Approximate correlations between various encoding stages.
const PASS1_COEFF = 0.3;
const PASS2_COEFF = 1 - PASS1_COEFF;

@useSheet({
  params: {
    display: "flex",
    marginBottom: 10,
  },
  preview: {
    flex: "0 30%",
    marginRight: 15,
  },
  title: {
    flex: "0 25%",
    marginRight: 15,
  },
  path: {
    flex: "1",
  },
  name: {
    width: "inherit",
    marginRight: 10,
    lineHeight: "30px",
  },
})
export default class extends React.PureComponent {
  state = {progress: 0, log: "", target: this.getDefaultTarget()};
  componentDidMount() {
    this.props.events.addListener("abort", this.abort);
    // We will re-use this path for temporal WebM but it's ok.
    this.tmpTestName = tmp.tmpNameSync({prefix: "boram-", postfix: ".mkv"});
    this.tmpLogName = tmp.tmpNameSync({prefix: "boram-", postfix: "-0.log"});
    this.tmpPreviewName = tmp.tmpNameSync({prefix: "boram-", postfix: ".webm"});
    this.tmpConcatName = tmp.tmpNameSync({prefix: "boram-", postfix: ".txt"});
  }
  componentWillUnmount() {
    this.props.events.removeListener("abort", this.abort);
    this.cleanup();
  }
  cleanup() {
    try { fs.unlinkSync(this.tmpTestName); } catch (e) { /* skip */ }
    try { fs.unlinkSync(this.tmpLogName); } catch (e) { /* skip */ }
    try { fs.unlinkSync(this.tmpPreviewName); } catch (e) { /* skip */ }
    try { fs.unlinkSync(this.tmpConcatName); } catch (e) { /* skip */ }
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
  start({test}) {
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
    const {source, vcodec} = this.props;
    const {preview, target} = this.state;
    const title = this.refs.title.getValue().trim();
    const baseArgs = parseArgs(this.props.rawArgs);
    const frameParser = this.createFrameParser();
    const startTime = this.now();

    // progress/log might be updated several times at one go so we need
    // to keep our local reference in addition to state's.
    let progress = 0;
    let log = "";
    let curpos = 0;
    let lastnl = 0;
    let passn = (this.props.mode2Pass && !test) ? 1 : 0;
    let outpath = (test || preview != null) ? this.tmpTestName : target;
    let encoding = true;
    let videop = test
      ? run(FFmpeg.getTestArgs({baseArgs, outpath}))
      : run(FFmpeg.getEncodeArgs({baseArgs, passlog, passn, title, outpath}));
    if (passn) {
      videop = videop.then(() => {
        frameParser.reset();
        passn = 2;
        handleLog(this.sep());
        return run(
          FFmpeg.getEncodeArgs({baseArgs, passlog, passn, title, outpath})
        );
      });
    }
    if (!test && preview != null) {
      videop = videop.then(() => {
        const inpath = Number.isFinite(preview) ? source.path : preview;
        const time = Number.isFinite(preview) ? preview : null;
        outpath = this.tmpPreviewName;
        handleLog(this.sep());
        return run(FFmpeg.getPreviewArgs({inpath, time, vcodec, outpath}));
      }).then(() => {
        const inpath = this.tmpTestName;
        const prevpath = this.tmpPreviewName;
        const listpath = this.tmpConcatName;
        outpath = listpath;
        FFmpeg.writeConcat({inpath, prevpath, outpath});
        outpath = target;
        handleLog(this.sep());
        return run(FFmpeg.getConcatArgs({inpath, listpath, outpath}));
      });
    }
    videop.then(() => {
      progress = 100;
      encoding = false;
      const output = {test, path: outpath};
      this.setState({output, progress});
      this.props.onProgress(progress);
      this.props.onEncoding(encoding);
      if (test) {
        this.handleOpen();
      } else {
        handleLog(this.showStats(startTime));
        this.updateTarget();
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
    return Array(51).join("=") + "\n";
  }
  showArgs(args) {
    return `$ ffmpeg ${quoteArgs(args)}\n`;
  }
  showStats(startTime) {
    const {size} = fs.statSync(this.state.output.path);
    const runTime = this.now() - startTime;
    return this.sep() + [
      `Output path: ${this.state.output.path}`,
      `Output duration: ${showTime(this.props._duration)}`,
      `Output bitrate: ${showBitrate(size / this.props._duration * 8)}`,
      `Output file size: ${showSize(size)}`,
      `Overall time spent: ${showTime(runTime)}`,
      "",
    ].join("\n");
  }
  isTestEncoding() {
    return this.props.encoding && this.state.test;
  }
  isNormalEncoding() {
    return this.props.encoding && !this.state.test;
  }
  toggleEncode({test}) {
    const encoding = !this.props.encoding;
    if (encoding) {
      this.clearState();
      this.setState({test});
      this.props.onEncoding(encoding);
      this.start({test});
    } else {
      this.cancel();
    }
  }
  getDefaultTitle() {
    const {saveAs, title, path: inpath} = this.props.source;
    const {tags} = this.props.format;
    if (title) {
      return title;
    } else if (tags && tags.title) {
      return tags.title;
    } else {
      return path.parse(saveAs || inpath).name;
    }
  }
  getTarget(sample) {
    let {dir, name: bareName} = path.parse(sample);
    bareName = bareName.replace(/-\d+$/, "");
    let index = 0;
    let target = "";
    do {
      const suffix = `-${index + 1}`;
      const name = `${bareName}${index ? suffix : ""}.webm`;
      target = path.join(dir, name);
      index += 1;
    } while (fs.existsSync(target));
    return target;
  }
  getDefaultTarget() {
    const dir = remote.app.getPath("desktop");
    const name = path.basename(this.props.source.saveAs ||
                               this.props.source.path);
    return this.getTarget(path.join(dir, name));
  }
  updateTarget() {
    const target = this.getTarget(this.state.target);
    this.setState({target});
  }
  isValidTarget() {
    const {target} = this.state;
    const dir = path.dirname(target);
    // test 1
    if (!path.isAbsolute(dir)) return false;
    // test 2
    try {
      if (!fs.statSync(dir).isDirectory()) return false;
      fs.accessSync(dir, fs.constants.W_OK);
    } catch (e) {
      return false;
    }
    // test 3
    try {
      if (!fs.statSync(target).isFile()) return false;
    } catch (e) {
      return true;
    }
    // test 4
    try {
      fs.accessSync(target, fs.constants.W_OK);
      return true;
    } catch (e) {
      return false;
    }
  }
  cachedValidTarget() {
    // Cache lot of syscalls.
    if (this.state.target === this.lastCachedTarget) {
      return this.lastCachedResult;
    }
    const result = this.isValidTarget();
    this.lastCachedTarget = this.state.target;
    this.lastCachedResult = result;
    return result;
  }
  isValid() {
    return this.props.allValid && this.cachedValidTarget();
  }
  getOutput() {
    if (this.state.log) return this.state.log;
    if (!this.props.allValid) return "Fix invalid settings.";
    if (!this.cachedValidTarget()) return "Fix invalid path.";
    let msg = "Ready to start.";
    // Potentially slow syscall but get executed not so often.
    if (fs.existsSync(this.state.target)) {
      msg += "\nWarning: file already exists.";
    }
    return msg;
  }
  getPrettyPreview() {
    const {preview} = this.state;
    if (Number.isFinite(preview)) {
      return showTime(preview);
    } else {
      return path.parse(preview || "").base;
    }
  }
  handlePreviewReset = (e) => {
    e.preventDefault();
    this.setState({preview: null});
  };
  handlePreviewTime = () => {
    this.setState({preview: this.props.onGetTime()});
  };
  handlePreviewImage = () => {
    const selected = remote.dialog.showOpenDialog({
      filters: [
        {name: "Images", extensions: ["jpg", "png"]},
        {name: "All files", extensions: ["*"]},
      ],
    });
    if (!selected) return;
    this.setState({preview: selected[0]});
  };
  handleTargetChange = (e) => {
    this.setState({target: e.target.value});
  };
  handleTargetDialog = () => {
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
  handleTestToggle = () => {
    this.toggleEncode({test: true});
  };
  handleNormalToggle = () => {
    this.toggleEncode({test: false});
  };
  handleOpen = () => {
    shell.openItem(this.state.output.path);
  };
  handleOpenFolder = () => {
    // <button disabled> doesn't block contextmenu.
    if (!this.state.output) return;
    shell.showItemInFolder(this.state.output.path);
  };
  clearState = () => {
    this.setState({progress: 0, log: "", output: null});
  };
  render() {
    const {classes} = this.sheet;
    return (
      <Pane vertical space={5} style2={{overflow: "hidden"}}>
        <div>
          <div className={classes.params}>
            <Prop
              name="preview"
              className={classes.preview}
              nameClassName={classes.name}
            >
              <Pane space={5} flex1="1" flex2="0">
                <SmallInput
                  hintText="empty"
                  title="Click to reset"
                  bottom
                  width="100%"
                  height={30}
                  style={{cursor: "pointer"}}
                  readOnly
                  value={this.getPrettyPreview()}
                  disabled={this.props.encoding}
                  onMouseDown={this.handlePreviewReset}
                />
                <div>
                  <SmallButton
                    icon={<Icon name="clock-o" />}
                    title="Use current video frame as a preview"
                    disabled={this.props.encoding}
                    onClick={this.handlePreviewTime}
                  />
                  <Sep margin={2.5} />
                  <SmallButton
                    icon={<Icon name="folder-open-o" />}
                    title="Load image preview"
                    disabled={this.props.encoding}
                    onClick={this.handlePreviewImage}
                  />
                </div>
              </Pane>
            </Prop>
            <Prop
              name="title"
              className={classes.title}
              nameClassName={classes.name}
            >
              <SmallInput
                ref="title"
                hintText="metadata title tag"
                left bottom
                width="100%"
                height={30}
                defaultValue={this.getDefaultTitle()}
                disabled={this.props.encoding}
              />
            </Prop>
            <Prop
              name="path"
              className={classes.path}
              nameClassName={classes.name}
            >
              <Pane space={5} flex1="1" flex2="0">
                <SmallInput
                  hintText="output file path"
                  left bottom
                  width="100%"
                  height={30}
                  value={this.state.target}
                  disabled={this.props.encoding}
                  onChange={this.handleTargetChange}
                />
                <SmallButton
                  icon={<Icon name="folder-open-o" />}
                  title="Select destination path"
                  disabled={this.props.encoding}
                  onClick={this.handleTargetDialog}
                />
              </Pane>
            </Prop>
          </div>
          <Pane space={5}>
            <div>
              <BigButton
                width={85}
                label={this.isTestEncoding() ? "cancel" : "test"}
                title="Make test encode"
                disabled={this.isNormalEncoding() || !this.isValid()}
                onClick={this.handleTestToggle}
              />
              <Sep margin={2.5} />
              <BigButton
                width={85}
                label={this.isNormalEncoding() ? "cancel" : "normal"}
                title="Make normal encode"
                disabled={this.isTestEncoding() || !this.isValid()}
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
        </div>
        <Output
          value={this.getOutput()}
          encoding={this.props.encoding}
          onClear={this.clearState}
        />
      </Pane>
    );
  }
}
