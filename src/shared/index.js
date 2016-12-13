/**
 * Some common variables for main and renderer processes.
 * This code is included to both output targets.
 * @module boram/shared
 */

import path from "path";
import electron from "electron";

const app = process.type === "renderer" ? electron.remote.app : electron.app;

export const APP_PATH = app.getAppPath();
export const DATA_PATH = app.getPath("userData");
export const PAGE_PATH = path.join(APP_PATH, "index.html");
export const ICON_BIG_PATH = path.join(APP_PATH, "icon-big.png");
export const WIN_FONTCONFIG_PATH = path.join(DATA_PATH, "fonts.conf");
