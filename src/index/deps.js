/**
 * Check required dependencies.
 * @module boram/index/deps
 */

/* eslint-disable no-console */

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
    console.error("Please install ffmpeg.");
    return false;
  }
  if (!hasBinary("ffprobe")) {
    console.error("ffprobe not found.");
    return false;
  }
  // No need to check versions - anything should be fine.
  if (!hasBinary("youtube-dl") && !hasBinary("python")) {
    console.error("Please install youtube-dl or python.");
    return false;
  }
  return true;
}
