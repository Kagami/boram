/**
 * Check required dependencies.
 * @module boram/index/deps
 */

import {execFileSync} from "child_process";
import which from "which";
import {LINUX_CHECKLIB_PATH} from "../shared";

function hasBinary(exe) {
  // Make sure to keep in sync with util module.
  const overrideEnv = `BORAM_${exe.toUpperCase().replace(/-/, "_")}`;
  if (process.env[overrideEnv]) return true;
  try {
    which.sync(exe);
    return true;
  } catch (e) {
    return false;
  }
}

function hasLibrary(lib) {
  try {
    execFileSync(LINUX_CHECKLIB_PATH, [lib], {stdio: "ignore"});
    return true;
  } catch (e) {
    return false;
  }
}

export function checkLinuxDeps() {
  // TODO(Kagami): Check for version and required codecs?
  if (!hasBinary("ffmpeg")) {
    throw new Error("ffmpeg not found");
  }
  if (!hasBinary("ffprobe")) {
    throw new Error("ffprobe not found");
  }
  if (!hasBinary("youtube-dl") && !hasBinary("python")) {
    throw new Error("youtube-dl/python not found");
  }
  if (!hasLibrary("libmpv.so.1") && !hasLibrary("libmpv.so")) {
    throw new Error("libmpv not found");
  }
}
