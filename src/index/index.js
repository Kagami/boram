/**
 * Main process entry point.
 * @module boram/index
 */

import fs from "fs";
import url from "url";
import {BrowserWindow, app, dialog} from "electron";
import {name, version} from "../../package.json";
import {APP_PATH, ICON_BIG_PATH, WIN_ICON_PATH, PAGE_PATH} from "../shared";
import {getPluginPath} from "./plugin";
import "file-loader?name=package.json!./package.json.electron";
import "./index.html";
import "./icon-big.png";
if (BORAM_WIN_BUILD) {
  require("./icon.ico");
}

const toRemoveNames = [];
global.removeOnQuit = function(name) {
  toRemoveNames.push(name);
};

if (BORAM_DEBUG) {
  // Don't use electron-debug because of
  // https://github.com/sindresorhus/electron-debug/issues/61
  const localShortcut = require("electron-localshortcut");
  localShortcut.register("F12", () => {
    const win = BrowserWindow.getFocusedWindow();
    win.webContents.toggleDevTools();
  });
  localShortcut.register("CmdOrCtrl+R", () => {
    const win = BrowserWindow.getFocusedWindow();
    win.webContents.reloadIgnoringCache();
  });
}
// Plugin init would fail if activated, sort of debug option.
if (process.env.BORAM_NO_HWACCEL) {
  app.disableHardwareAcceleration();
}
// Plugin checks and setup. Can't be run on ready.
(function() {
  // Broken since 1.6.2. See:
  // <https://github.com/electron/electron/issues/8807>.
  if (!BORAM_MAC_BUILD) {
    app.commandLine.appendSwitch("ignore-gpu-blacklist");
  }
  if (!BORAM_LIN_BUILD) {
    // Workaround issue with non-ASCII paths. Can't use on Linux because
    // renderer process is spawned by zygote which don't inherit our
    // CWD. See: <https://github.com/electron/electron/issues/3306>.
    process.chdir(APP_PATH);
  }
  const pluginPath = getPluginPath();
  if (!pluginPath) {
    dialog.showErrorBox(
      "Unsupported location detected",
      "Because of Chromium limitation, boram can't be run from path " +
      "with non-ASCII characters. Please run boram as ASCII-only path."
    );
    return app.exit(1);
  }
  app.commandLine.appendSwitch(
    "register-pepper-plugins", `${pluginPath};application/x-boram`
  );
})();

function runtimeChecks() {
  if (BORAM_WIN_BUILD && !BORAM_X64_BUILD) {
    const arch = require("arch")();
    if (arch === "x64") {
      dialog.showMessageBox({
        type: "warning",
        title: "Wrong build",
        message: "You're running x86 build on x64 system. " +
                 "Consider using x64 build for better performance.",
      });
    }
  }
  if (BORAM_LIN_BUILD) {
    try {
      require("./deps").checkLinuxDeps();
    } catch (e) {
      dialog.showErrorBox(
        e.message,
        "Install required dependencies and try again."
      );
      return app.exit(1);
    }
  }
}

app.on("ready", () => {
  runtimeChecks();
  const win = new BrowserWindow({
    width: 960,
    height: 960,
    minWidth: 640,
    minHeight: 640,
    // Works strangely on Linux. useContentSize=false enlarges window to
    // include borders and useContentSize=true enlarges even more.
    useContentSize: BORAM_WIN_BUILD || BORAM_MAC_BUILD,
    title: `${name} v${version} by T-ara Industries`,
    icon: BORAM_WIN_BUILD ? WIN_ICON_PATH : ICON_BIG_PATH,
    webPreferences: {
      plugins: true,
    },
  });
  win.setMenu(null);
  win.loadURL(url.format({
    pathname: PAGE_PATH,
    protocol: "file:",
    slashes: true,
  }));
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("quit", () => {
  toRemoveNames.forEach(name => {
    try { fs.unlinkSync(name); } catch (e) { /* skip */ }
  });
});
