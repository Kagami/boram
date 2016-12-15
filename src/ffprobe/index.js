/**
 * ffprobe wrapper. Provides platform-independent Promise API.
 * @module boram/ffprobe
 */

import {makeRunner} from "../util";
if (BORAM_WIN_BUILD) {
  require.context(
    "../../bin/ffmpeg-latest-win32-shared/bin",
    false,
    /\.dll$|[\/\\]ffprobe\.exe$/);
}

export default makeRunner("ffprobe", {
  getInfo(inpath) {
    return this._run([
      "-v", "error",
      "-of", "json",
      "-show_format", "-show_streams",
      "-i", `file:${inpath}`,
    ]).then(JSON.parse);
  },
});
