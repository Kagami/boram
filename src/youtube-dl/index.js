/**
 * youtube-dl wrapper. Provides platform-independent Promise API.
 * @module boram/youtube-dl
 */

import assert from "assert";
import {makeRunner} from "../util";
const YTDL = require(
  "file?name=[name].[ext]!../../bin/youtube-dl." +
  (BORAM_WIN_BUILD ? "exe" : "zip")
);

export default makeRunner("youtube-dl", {
  _fixPathArgs(runpath, args) {
    if (runpath) {
      return [runpath, args];
    } else {
      assert(!BORAM_WIN_BUILD, "youtube-dl must always be in PATH on Windows");
      return ["python", [YTDL].concat(args)];
    }
  },
  getInfo(url) {
    return this._run(["--no-playlist", "-j", "--", url]).then(JSON.parse);
  },
});
