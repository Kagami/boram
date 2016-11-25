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
  download({url, format, outpath}, onUpdate) {
    const args = [
      "--no-playlist",
      "--write-sub", "--embed-subs",
      "--merge-output-format", "mkv",
      "--no-part",
      "-f", format,
      "-o", outpath,
      "--",
      url,
    ];

    let log = "";
    let progress = 0;
    return this._run(args, (chunk) => {
      // FIXME(Kagami): Windows \r\n?
      chunk = chunk.toString();
      const cr = chunk.lastIndexOf("\r");
      const nl = chunk.lastIndexOf("\n");
      const lastnl = Math.max(cr, nl);
      if (lastnl > -1) {
        let nextlastnl = -1;
        if (lastnl > 0) {
          const cr = chunk.lastIndexOf("\r", lastnl - 1);
          const nl = chunk.lastIndexOf("\n", lastnl - 1);
          nextlastnl = Math.max(cr, nl);
        }
        const status = nextlastnl > -1 ? chunk.slice(nextlastnl + 1, lastnl)
                                       : log + chunk.slice(0, lastnl);
        log = chunk.slice(lastnl + 1);
        const matched = status.match(/\s(\d+(\.\d+)?)%\s/);
        if (matched) {
          progress = parseFloat(matched[1]);
        }
        onUpdate({progress, status});
      } else {
        log += chunk;
      }
    });
  },
});
