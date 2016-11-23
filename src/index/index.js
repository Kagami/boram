/**
 * Main process entry point.
 * @module boram/index
 */

import tmp from "tmp";
import {app, BrowserWindow} from "electron";
import pkg from "json!../../package.json";
import "file!./index.html";
import "file!./icon.png";

if (BORAM_DEBUG) {
  require("electron-debug")();
}

tmp.setGracefulCleanup();

app.on("ready", () => {
  const win = new BrowserWindow({
    width: 960,
    height: 960,
    minWidth: 960,
    minHeight: 960,
    title: `${pkg.name} v${pkg.version}`,
    icon: `${__dirname}/icon.png`,
  });
  win.setMenu(null);
  win.loadURL(`file://${__dirname}/index.html`);
});

app.on("window-all-closed", () => {
  app.quit();
});
