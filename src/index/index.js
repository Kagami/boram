/**
 * Main process entry point.
 * @module boram/index
 */

import url from "url";
import path from "path";
import {BrowserWindow, app, dialog} from "electron";
import {name, version} from "json!../../package.json";
import {checkLinuxDeps} from "./deps";
import "file!./package.json";
import "file!./index.html";
import "file!./icon.png";
import "file!./icon-big.png";

// Used by renderer process.
global.tmp = require("tmp");
global.tmp.setGracefulCleanup();

if (BORAM_DEBUG) {
  require("electron-debug")({enabled: true});
}

if (process.env.BORAM_NO_HWACCEL) {
  app.disableHardwareAcceleration();
}

function containsNonASCII(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      return true;
    }
  }
  return false;
}

const APP_PATH = app.getAppPath();
const PLUGIN_NAME = BORAM_WIN_BUILD ? "boram.dll" : "libboram.so";
const FULL_PLUGIN_PATH = path.join(APP_PATH, PLUGIN_NAME);
let PLUGIN_PATH = path.relative(process.cwd(), FULL_PLUGIN_PATH);
// "plugin.so" doesn't work, "./plugin.so" is required.
PLUGIN_PATH = `.${path.sep}${PLUGIN_PATH}`;

if (containsNonASCII(PLUGIN_PATH)) {
  dialog.showErrorBox(
    "Unsupported location detected",
    "Because of Chromium limitation, boram can't be run from path " +
    "with non-ASCII characters. Please run boram as ASCII-only path."
  );
  return app.exit(1);
}

app.commandLine.appendSwitch(
  "register-pepper-plugins", `${PLUGIN_PATH};application/x-boram`
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
    icon: path.join(APP_PATH, "icon-big.png"),
    webPreferences: {
      plugins: true,
    },
  });
  win.setMenu(null);
  win.loadURL(url.format({
    pathname: path.join(APP_PATH, "index.html"),
    protocol: "file:",
    slashes: true,
  }));
});

app.on("window-all-closed", () => {
  app.quit();
});
