/**
 * Main process entry point.
 * @module boram/index
 */

import tmp from "tmp";
import {BrowserWindow, app} from "electron";
import {name, version} from "json!../../package.json";
import "file!./index.html";
import "file!./icon.png";

if (BORAM_DEBUG) {
  require("electron-debug")();
}

tmp.setGracefulCleanup();

app.on("ready", () => {
  const width = 960;
  const height = 960;
  const win = new BrowserWindow({
    width,
    height,
    minWidth: width,
    minHeight: height,
    title: `${name} v${version} by tiarathread`,
    icon: `${__dirname}/icon.png`,
  });
  win.setMenu(null);
  win.loadURL(`file://${__dirname}/index.html`);
});

app.on("window-all-closed", () => {
  app.quit();
});
