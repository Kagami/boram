/**
 * Some common variables for main and renderer processes.
 * This code is included to both output targets.
 * @module boram/shared
 */

import path from "path";
import electron from "electron";

const app = process.type === "renderer" ? electron.remote.app : electron.app;

export const APP_PATH = app.getAppPath();
export const PAGE_PATH = path.join(APP_PATH, "index.html");
export const ICON_BIG_PATH = path.join(APP_PATH, "icon-big.png");
export const WIN_ICON_PATH = path.join(APP_PATH, "icon.ico");
export const LINUX_CHECKLIB_PATH = path.join(APP_PATH, "checklib");
