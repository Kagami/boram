/**
 * Check required dependencies.
 * @module boram/index/deps
 */

import which from "which";

function hasBinary(exe) {
  try {
    which.sync(exe);
    return true;
  } catch (e) {
    return false;
  }
}

export function checkLinuxDeps() {
  // TODO(Kagami): Check for libmpv.
  // TODO(Kagami): Check for version and required codecs?
  if (!hasBinary("ffmpeg")) {
    throw new Error("Please install ffmpeg");
  }
  if (!hasBinary("ffprobe")) {
    throw new Error("ffprobe not found");
  }
  // No need to check versions - anything should be fine.
  if (!hasBinary("youtube-dl") && !hasBinary("python")) {
    throw new Error("Please install youtube-dl or python");
  }
}
