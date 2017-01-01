/**
 * Main process entry point.
 * @module boram/index
 */

import url from "url";
import {BrowserWindow, app, dialog} from "electron";
import {name, version} from "json!../../package.json";
import {ICON_BIG_PATH, WIN_ICON_PATH, PAGE_PATH} from "../shared";
import {getPluginPath} from "./plugin";
import "file!./package.json";
import "file!./index.html";
import "file!./icon-big.png";
if (BORAM_WIN_BUILD) {
  require("file!./icon.ico");
}

// Used by renderer process.
global.tmp = require("tmp");
global.tmp.setGracefulCleanup();

if (BORAM_DEBUG) {
  require("electron-debug")({enabled: true});
}
if (process.env.BORAM_NO_HWACCEL) {
  app.disableHardwareAcceleration();
}
if (process.env.BORAM_FIX_GPU) {
  app.commandLine.appendSwitch("ignore-gpu-blacklist");
}
// Can't be run on ready.
(function() {
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
  if (BORAM_WIN_BUILD) {
    const arch = require("arch")();
    const wrongBuildMsg = (BORAM_X64_BUILD && arch !== "x64")
      ? "You're trying to run x64 build on x86 system."
      : (!BORAM_X64_BUILD && arch !== "x86")
        // Strictly not an error but x64 build will be faster.
        ? "You're trying to run x86 build on x64 system."
        : null;
    if (wrongBuildMsg) {
      dialog.showErrorBox("Wrong build", wrongBuildMsg);
      return app.exit(1);
    }
  }

  if (BORAM_WIN_BUILD) {
    require("../fonts").setupWindowsFontconfig();
  }

  if (!BORAM_WIN_BUILD) {
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
    minHeight: 780,
    // Works strangely on Linux. useContentSize=false enlarges window to
    // include borders and useContentSize=true enlarges even more.
    useContentSize: BORAM_WIN_BUILD,
    title: `${name} v${version} by t-ara.industries`,
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
