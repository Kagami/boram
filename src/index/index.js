/**
 * Main process entry point.
 * @module boram/index
 */

import {BrowserWindow, app} from "electron";
import {name, version} from "json!../../package.json";
import "file!./index.html";
import "file!./icon.png";
// Need to have some valid package.json, so provide empty stub.
import "file!./package.json";

// Used by renderer process.
global.tmp = require("tmp");
global.tmp.setGracefulCleanup();

if (BORAM_DEBUG) {
  require("electron-debug")();
}

app.on("ready", () => {
  const win = new BrowserWindow({
    width: 960,
    height: 960,
    minWidth: 640,
    minHeight: 780,
    title: `${name} v${version} by tiarathread`,
    icon: `${__dirname}/icon.png`,
  });
  win.setMenu(null);
  win.loadURL(`file://${__dirname}/index.html`);
});

app.on("window-all-closed", () => {
  app.quit();
});
