/**
 * Helper routines and widgets.
 * @module boram/util
 */

import assert from "assert";
import path from "path";
import {spawn} from "child_process";
import which from "which";
import {parse as _parseArgs} from "shell-quote";
import {APP_PATH} from "../shared";

/** Like Number#toFixed but floors instead of rounding. */
export function floorFixed(n, digits) {
  const factor = Math.pow(10, digits);
  n = Math.floor(n * factor) / factor;
  return n.toFixed(digits);  // Fill with zeroes if neccessary
}

/** Like Number#toFixed but ceils instead of rounding. */
export function ceilFixed(n, digits) {
  const factor = Math.pow(10, digits);
  n = Math.ceil(n * factor) / factor;
  return n.toFixed(digits);
}

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
  return Math.floor(bitrate / 1000) + " Kbps";
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

function pad2(n) {
  n = Math.floor(n);
  return n < 10 ? "0" + n : n.toString();
}

export function showTime(duration, opts = {}) {
  const sep = opts.sep || ":";
  const round = opts.ceil ? ceilFixed : floorFixed;
  const h = Math.floor(duration / 3600);
  // Try to avoid floating point inaccuracy.
  const frac = parseFloat((duration % 1).toFixed(5));
  let ts = h ? h + sep : "";
  ts += pad2(duration % 3600 / 60) + sep;
  ts += pad2(duration % 60);
  ts += round(frac, 3).slice(1, 5);
  return ts;
}

export function parseFrameRate(rate) {
  const [num, den] = rate.split("/", 2).map(n => parseInt(n, 10));
  return num / den;
}

export function showFrameRate(rate) {
  return (rate % 1 ? rate.toFixed(3) : rate) + " fps";
}

export function parseAR(ratio) {
  ratio = ratio || "";
  let [num, den] = ratio.split(":", 2);
  // Invalid/unknown value is marked as "0:1".
  num = parseInt(num, 10) || 0;
  den = parseInt(den, 10) || 1;
  return (num && den) ? (num / den) : 1;
}

export function round2(n) {
  return Math.floor((n + 1) / 2) * 2;
}

export function showErr(err) {
  return err ? err.message : null;
}

export function showProgress(progress) {
  const space = progress < 10 ? " " : "";
  return `${space}${progress.toFixed(1)}%`;
}

export function showLang(track) {
  if (track.tags && track.tags.language && track.tags.language !== "und") {
    return track.tags.language;
  } else {
    return null;
  }
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

// TODO(Kagami): shell-quote doesn't throw on unmatched quotes and
// also parses things like stream redirections and pipes which we
// don't need. Use some better parser.
export function parseArgs(rawArgs) {
  return _parseArgs(rawArgs).filter(arg => typeof arg === "string");
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

export function getOpt(arr, key, def) {
  let prev = false;
  const res = arr.find(v => {
    if (prev) {
      return true;
    } else if (v === key) {
      prev = true;
    }
  });
  return res == null ? def : res;
}

export function fixOpt(arr, key, newval, opts = {}) {
  let found = false;
  let prev = false;
  arr.forEach((v, i) => {
    if (prev) {
      arr[i] = typeof newval === "function" ? newval(v) : newval;
      prev = false;
      found = true;
    } else if (v === key) {
      prev = true;
    }
  });
  if (!found) {
    if (opts.add) {
      const v = typeof newval === "function" ? newval(null) : newval;
      arr.push(key, v);
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

export function getRunPath(exe, opts = {}) {
  const overrideEnv = `BORAM_${exe.toUpperCase().replace(/-/, "_")}`;
  const overridePath = process.env[overrideEnv];
  if (overridePath) {
    return overridePath;
  } else if (opts.system || BORAM_LIN_BUILD) {
    try {
      return which.sync(exe);
    } catch (e) {
      return null;
    }
  } else {
    // Don't prefer binaries from PATH on Win/Mac because they might be
    // broken or not suited for WebM encoding.
    return path.join(APP_PATH, exe);
  }
}

export function makeRunner(exe, obj) {
  return {
    ...obj,
    _run(args, onLog) {
      let altexe = "";
      let stdout = "";
      let stderr = "";
      let runpath = getRunPath(exe);
      if (this._fixPathArgs) {
        [runpath, args, altexe] = this._fixPathArgs(runpath, args);
      }
      let child = null;
      const runner = new Promise((resolve, reject) => {
        if (!runpath) {
          throw new Error(`Failed to run ${exe}: ` +
                          `${altexe || "executable"} not found`);
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
