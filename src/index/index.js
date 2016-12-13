/**
 * Main process entry point.
 * @module boram/index
 */

import url from "url";
import path from "path";
import {BrowserWindow, app, dialog} from "electron";
import {name, version} from "json!../../package.json";
import {getPluginPath} from "./plugin";
import "file!./package.json";
import "file!./index.html";
import "file!./icon.png";
import "file!./icon-big.png";

const APP_PATH = app.getAppPath();

// Used by renderer process.
global.tmp = require("tmp");
global.tmp.setGracefulCleanup();

if (BORAM_DEBUG) {
  require("electron-debug")({enabled: true});
}

if (process.env.BORAM_NO_HWACCEL) {
  app.disableHardwareAcceleration();
}

if (!BORAM_WIN_BUILD && !require("./deps").checkLinuxDeps()) {
  dialog.showErrorBox(
    "Dependency missing",
    "Dependencies check failed. Exiting."
  );
  app.exit(1);
}

const pluginPath = getPluginPath();
if (!pluginPath) {
  dialog.showErrorBox(
    "Unsupported location detected",
    "Because of Chromium limitation, boram can't be run from path " +
    "with non-ASCII characters. Please run boram as ASCII-only path."
  );
  app.exit(1);
}
app.commandLine.appendSwitch(
  "register-pepper-plugins", `${pluginPath};application/x-boram`
);

if (BORAM_WIN_BUILD) {
  require("../fonts").setupWindowsFontconfig();
}

app.on("ready", () => {
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
