/**
 * FFmpeg fonts/fontconfig helpers.
 * @module boram/fonts
 */

import fs from "fs";
import path from "path";
import util from "util";
import {APP_PATH, DATA_PATH, WIN_FONTCONFIG_PATH} from "../shared";
import fontsConfTmpl from "raw!./fonts.conf.tmpl";
import "file!./aliases.conf";

// <https://stackoverflow.com/a/27979933>.
function escapeXML(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
    case "<": return "&lt;";
    case ">": return "&gt;";
    case "&": return "&amp;";
    case "'": return "&apos;";
    case '"': return "&quot;";
    }
  });
}

export function setupWindowsFontconfig() {
  const winDir = process.env.SystemRoot || "C:\\Windows";
  const systemFontsPath = path.join(winDir, "Fonts");
  const aliasesPath = path.join(APP_PATH, "aliases.conf");
  const cachePath = path.join(DATA_PATH, "fc-cache");
  const fontsConf = util.format(
    fontsConfTmpl,
    escapeXML(systemFontsPath),
    escapeXML(aliasesPath),
    escapeXML(cachePath)
  );
  fs.writeFileSync(WIN_FONTCONFIG_PATH, fontsConf);
}
