/**
 * Helper routines and widgets.
 * @module boram/util
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import {spawn} from "child_process";
import which from "which";
import {remote} from "electron";

export const APP_PATH = remote.app.getAppPath();
export const ICON_BIG_PATH = path.join(APP_PATH, "icon-big.png");

// Renderer process doesn't receive process exit events so need to setup
// cleanup inside main process.
export const tmp = remote.getGlobal("tmp");

export function showSize(size, opts = {}) {
  const space = opts.tight ? "" : " ";
  if (size < 1024) {
    return `${size}${space}B`;
  } else if (size < 1024 * 1024) {
    size /= 1024;
    return `${size.toFixed(2)}${space}KiB`;
  } else {
    size /= 1024 * 1024;
    return `${size.toFixed(2)}${space}MiB`;
  }
}

export function showBitrate(bitrate) {
  if (bitrate < 1000) {
    return bitrate + " bps";
  } else if (bitrate < 1000 * 1000) {
    bitrate /= 1000;
    return bitrate.toFixed(2) + " Kbps";
  } else {
    bitrate /= 1000 * 1000;
    return bitrate.toFixed(2) + " Mbps";
  }
}

function pad2(n) {
  n |= 0;
  return n < 10 ? "0" + n : n.toString();
}

export function parseTime(time) {
  if (Number.isFinite(time)) return time;
  // [hh]:[mm]:[ss[.xxx]]
  const m = time.match(/^(?:(\d+):)?(?:(\d+)+:)?(\d+(?:\.\d+)?)$/);
  assert(m, "Invalid time");
  const [hours, minutes, seconds] = m.slice(1);
  let duration = Number(seconds);
  if (hours) {
    if (minutes) {
      // 1:2:3 -> [1, 2, 3]
      duration += Number(minutes) * 60;
      duration += Number(hours) * 3600;
    } else {
      // 1:2 -> [1, undefined, 2]
      duration += Number(hours) * 60;
    }
  }
  return duration;
}

export function showTime(duration, sep) {
  let ts = pad2(duration / 60) + (sep || ":");
  ts += pad2(duration % 60);
  ts += (duration % 1).toFixed(3).slice(1, 5);
  return ts;
}

export function parseFrameRate(rate) {
  const [num, den] = rate.split("/", 2).map(n => parseInt(n, 10));
  return num / den;
}

export function showFrameRate(rate) {
  return (rate % 1 ? rate.toFixed(3) : rate) + " fps";
}

export function parseTimeBase(tb) {
  const [num, den] = tb.split("/", 2).map(n => parseInt(n, 10));
  return num / den;
}

/** Simple helper since JavaScript lacks coffee's "?." */
export function showErr(err) {
  return err ? err.message : null;
}

/**
 * Escape shell argument.
 */
export function escapeArg(arg) {
  arg = arg.replace(/\\/g, "\\\\");
  arg = arg.replace(/"/g, '\\"');
  arg = arg.replace(/\$/g, "\\$");
  arg = arg.replace(/`/g, "\\`");
  return `"${arg}"`;
}

/**
 * Analogue of `shell-quote.quote` with double quotes and more pretty
 * escaping.
 *
 * It's probably broken for extreme cases but this function is
 * not that important anyway (basically to allow user to copypaste
 * command from log into real console).
 */
export function quoteArgs(args) {
  return args.map(arg => {
    // Reserved shell symbols.
    if (/[\s'"<>|&;()*\\\[\]]/.test(arg)) {
      return escapeArg(arg);
    } else {
      return arg;
    }
  }).join(" ");
}

export function fixOpt(arr, key, newval, opts = {}) {
  let found = false;
  let prev = false;
  arr.forEach((v, i) => {
    if (prev) {
      arr[i] = newval;
      prev = false;
      found = true;
    } else if (v === key) {
      prev = true;
    }
  });
  if (!found) {
    if (opts.add) {
      arr.push(key, newval);
    }
  }
}

export function clearOpt(arr, key) {
  let prev = false;
  const newarr = arr.filter(v => {
    if (prev) {
      prev = false;
      return false;
    } else if ((!Array.isArray(key) && v === key) ||
               (Array.isArray(key) && key.includes(v))) {
      prev = true;
      return false;

    } else {
      return true;
    }
  });
  arr.length = 0;
  arr.push(...newarr);
}

export function tryRun(fn, arg, def) {
  const args = arguments.length > 1
    ? (Array.isArray(arg) ? arg : [arg])
    : [];
  try {
    return fn(...args);
  } catch (e) {
    return def;
  }
}

export function getRunPath(exe) {
  try {
    return which.sync(exe);
  } catch (e) {
    // We ship all required binaries with Windows version, on Linux few
    // deps should be installed separately.
    // TODO(Kagami): Ship static ffmpeg build in Linux version too? Some
    // distros have too old libvpx, making it impractical to use VP9.
    if (BORAM_WIN_BUILD) {
      return path.join(APP_PATH, exe);
    } else {
      return null;
    }
  }
}

export function makeRunner(exe, obj) {
  return {
    ...obj,
    _run(args, onLog) {
      let stdout = "";
      let stderr = "";
      let runpath = getRunPath(exe);
      if (this._fixPathArgs) {
        [runpath, args] = this._fixPathArgs(runpath, args);
      }
      let child = null;
      const runner = new Promise((resolve, reject) => {
        if (!runpath) {
          throw new Error(`Failed to run ${exe}: executable not found`);
        }
        try {
          child = spawn(runpath, args, {stdio: ["ignore", "pipe", "pipe"]});
        } catch (err) {
          throw new Error(`Failed to run ${exe}: ${err.message}`);
        }
        child.stdout.on("data", data => {
          stdout += data;
          if (onLog) {
            onLog(data);
          }
        });
        child.stderr.on("data", data => {
          stderr += data;
          if (onLog) {
            onLog(data);
          }
        });
        child.on("error", err => {
          child = null;
          reject(new Error(`Failed to run ${exe}: ${err.message}`));
        });
        child.on("close", (code, signal) => {
          child = null;
          if (code || code == null) {
            const err = new Error(`${exe} exited with code ${code} ` +
                                  `(${stderr.trim()})`);
            err.code = code;
            err.signal = signal;
            return reject(err);
          }
          resolve(stdout);
        });
      });
      runner.kill = (signal) => {
        if (child) {
          child.kill(signal);
        }
      };
      return runner;
    },
  };
}

export const moveSync = (function() {
  const BUF_LENGTH = 64 * 1024;
  const buf = Buffer.alloc(BUF_LENGTH);
  return function _moveSync(src, dst) {
    try {
      fs.renameSync(src, dst);
    } catch (e) {
      if (e.code === "EXDEV") {
        const fdr = fs.openSync(src, "r");
        const fdw = fs.openSync(dst, "w");
        let bytesRead = 0;
        let pos = 0;

        do {
          bytesRead = fs.readSync(fdr, buf, 0, BUF_LENGTH, pos);
          fs.writeSync(fdw, buf, 0, bytesRead);
          pos += bytesRead;
        } while (bytesRead);

        fs.closeSync(fdr);
        fs.closeSync(fdw);
        fs.unlinkSync(src);
      } else {
        throw e;
      }
    }
  };
})();
