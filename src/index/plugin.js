/**
 * Plugin routines.
 * @module boram/index/plugin
 */

import path from "path";
import {APP_PATH} from "../shared";

function containsNonASCII(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      return true;
    }
  }
  return false;
}

export function getPluginPath() {
  const pluginName = BORAM_WIN_BUILD ? "boram.dll" : "libboram.so";
  const fullPluginPath = path.join(APP_PATH, pluginName);
  let pluginPath = path.relative(process.cwd(), fullPluginPath);
  // "plugin.so" doesn't work, "./plugin.so" is required.
  pluginPath = `.${path.sep}${pluginPath}`;
  return containsNonASCII(pluginPath) ? null : pluginPath;
}
