/**
 * Main process entry point.
 * @module boram/index
 */

import url from "url";
import path from "path";
import {BrowserWindow, app} from "electron";
import {name, version} from "json!../../package.json";
import {checkLinuxDeps} from "./deps";
import "file!./index.html";
import "file!./icon.png";
import "file!./icon-big.png";
// Need to have some valid package.json, so provide empty stub.
import "file!./package.json";

// Used by renderer process.
global.tmp = require("tmp");
global.tmp.setGracefulCleanup();

if (BORAM_DEBUG) {
  require("electron-debug")({enabled: true});
}

const PLUGIN_NAME = BORAM_WIN_BUILD ? "mpvinterop.dll" : "libmpvinterop.so";
const PLUGIN_PATH = path.join(__dirname, PLUGIN_NAME);
app.commandLine.appendSwitch(
  "register-pepper-plugins", `${PLUGIN_PATH};application/x-mpv`
);

app.on("ready", () => {
  if (!BORAM_WIN_BUILD) {
    if (!checkLinuxDeps()) {
      /* eslint-disable no-console */
      console.error("Dependencies check failed. Exiting.");
      /* eslint-enable no-console */
      return app.exit(1);
    }
  }

  const win = new BrowserWindow({
    width: 960,
    height: 960,
    minWidth: 640,
    minHeight: 780,
    // Works strangely on Linux. useContentSize=false enlarges window to
    // include borders and useContentSize=true enlarges even more. WM
    // issue?
    useContentSize: BORAM_WIN_BUILD,
    title: `${name} v${version} by t-ara.industries`,
    icon: path.join(__dirname, "icon-big.png"),
    webPreferences: {
      plugins: true,
    },
  });
  win.setMenu(null);
  win.loadURL(url.format({
    pathname: path.join(__dirname, "index.html"),
    protocol: "file:",
    slashes: true,
  }));
});

app.on("window-all-closed", () => {
  app.quit();
});
