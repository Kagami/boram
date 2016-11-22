/**
 * ffmpeg wrapper. Provides platform-independent Promise API.
 * @module boram/ffmpeg
 */

import {makeRunner} from "../util";
if (BORAM_WIN_BUILD) {
  require.context(
    "../../bin/ffmpeg-latest-win64-shared/bin",
    false,
    /\.dll$|[\/\\]ffmpeg\.exe$/);
}

export default makeRunner("ffmpeg", {
});
