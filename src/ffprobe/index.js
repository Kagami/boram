/**
 * ffprobe wrapper. Provides platform-independent Promise API.
 * @module boram/ffprobe
 */

import {makeRunner} from "../util";
if (BORAM_WIN_BUILD) {
  if (BORAM_X64_BUILD) {
    require.context("../../bin/win64/bin-video", false,
                    /\.dll$|[\/\\]ffprobe\.exe$/);
  } else {
    require.context("../../bin/win32/bin-video", false,
                    /\.dll$|[\/\\]ffprobe\.exe$/);
  }
} else if (BORAM_MAC_BUILD) {
  require.context("../../bin/mac64", false, /\.dylib$|[\/\\]ffprobe$/);
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
