import assert from "assert";
import path from "path";
import webpack from "webpack";
import ExtractTextPlugin from "extract-text-webpack-plugin";

function intree(...parts) {
  const escapedDir = __dirname.replace(/\\/g, "\\\\");
  const escapedSep = path.sep.replace(/\\/g, "\\\\");
  const escapedPath = [escapedDir].concat(parts).join(escapedSep);
  return new RegExp("^" + escapedPath + "$", "i");
}

function infa(...parts) {
  return intree("node_modules", "font-awesome", ...parts);
}

const APP_PATH = path.join("dist", "app");
const BORAM_DEBUG = process.env.NODE_ENV !== "production";
const BORAM_PLATFORM = process.env.BORAM_PLATFORM || "lin64";
const BORAM_WIN_BUILD = BORAM_PLATFORM.startsWith("win");
const BORAM_MAC_BUILD = BORAM_PLATFORM.startsWith("mac");
const BORAM_LIN_BUILD = BORAM_PLATFORM.startsWith("lin");
assert(BORAM_WIN_BUILD || BORAM_MAC_BUILD || BORAM_LIN_BUILD,
       "Unknown platform");
const BORAM_X64_BUILD = BORAM_PLATFORM.endsWith("64");
const ExtractLoader = ExtractTextPlugin.extract("css");
const COMMON_PLUGINS = [
  new webpack.DefinePlugin({
    BORAM_DEBUG,
    BORAM_WIN_BUILD,
    BORAM_MAC_BUILD,
    BORAM_LIN_BUILD,
    BORAM_X64_BUILD,
  }),
  new ExtractTextPlugin("index.css"),
];
const PLUGINS = BORAM_DEBUG ? COMMON_PLUGINS : COMMON_PLUGINS.concat([
  // This will help minificator to delete debug code.
  new webpack.DefinePlugin({"process.env.NODE_ENV": '"production"'}),
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.optimize.UglifyJsPlugin({
    output: {comments: false},
    compress: {warnings: false},
  }),
]);

export default {
  // Exit with code on errors.
  bail: !BORAM_DEBUG,
  // Make electron's virtual modules work.
  target: "electron",
  node: {
    // Don't mess with node's dirname variable.
    __dirname: false,
  },
  externals: [
    // Mute warning.
    "devtron",
    // Brings tons of useless code.
    {"pretty-error": "Error"},
  ],
  entry: {
    index: "./src/index/index",
    renderer: "./src/index/renderer",
  },
  output: {
    path: path.join(__dirname, APP_PATH),
    filename: "[name].js",
  },
  module: {
    loaders: [
      // Latest node is almost ES2015-ready but need to transpile few
      // unsupported features.
      {test: intree("src", ".+\\.js"), loader: "babel"},
      // Predefined loaders for Font Awesome because requires are inside
      // libraries and we can't control them.
      {test: infa(".+\\.css"), loader: ExtractLoader},
      {test: infa(".+\\.woff2(\\?v=[\\d.]+)?"), loader: "file"},
      {test: infa(".+\\.(ttf|eot|svg|woff)(\\?v=[\\d.]+)?"), loader: "skip"},
      // Predefined loaders for binaries because we can't(?) add loaders
      // to `require.context`.
      {test: intree("bin", "win(32|64)", ".+\\.(dll|exe)"), loader: "file"},
      {test: intree("bin", "mac64", ".+\\.dylib"), loader: "file"},
      {test: intree("bin", "mac64", "[^.]+"), loader: "file?name=[name]"},
    ],
  },
  fileLoader: {
    name: "[name].[ext]",
  },
  plugins: PLUGINS,
};
