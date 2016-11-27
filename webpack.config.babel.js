import path from "path";
import webpack from "webpack";
import ExtractTextPlugin from "extract-text-webpack-plugin";

function insrc(...parts) {
  return new RegExp("^" + path.join(__dirname, "src", ...parts) + "$");
}

function inmodules(...parts) {
  return new RegExp("^" + path.join(__dirname, "node_modules", ...parts) + "$");
}

function infa(...parts) {
  return inmodules("font-awesome", ...parts);
}

const DIST_DIR = path.join("dist", "app");
const BORAM_DEBUG = process.env.NODE_ENV !== "production";
const BORAM_WIN_BUILD = process.env.PLATFORM === "win64";
const ExtractLoader = ExtractTextPlugin.extract("css");
const COMMON_PLUGINS = [
  new webpack.DefinePlugin({BORAM_DEBUG, BORAM_WIN_BUILD}),
  new ExtractTextPlugin("index.css"),
];
const PLUGINS = BORAM_DEBUG ? COMMON_PLUGINS : COMMON_PLUGINS.concat([
  new webpack.DefinePlugin({"process.env.NODE_ENV": '"production"'}),
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.optimize.UglifyJsPlugin({
    output: {comments: false},
    compress: {warnings: false},
  }),
]);

export default {
  // Make electron's virtual modules work.
  target: "electron",
  node: {
    // Don't mess with node's dirname variable.
    __dirname: false,
  },
  // Mute warning.
  externals: ["devtron"],
  entry: {
    index: "./src/index/index",
    renderer: "./src/index/renderer",
  },
  output: {
    path: path.join(__dirname, DIST_DIR),
    filename: "[name].js",
  },
  module: {
    loaders: [
      {test: insrc(".+\\.js"), loader: "babel"},
      // Font Awesome.
      {test: infa(".+\\.css"), loader: ExtractLoader},
      {test: infa(".+\\.woff2(\\?v=[\\d.]+)?"), loader: "file"},
      {test: infa(".+\\.(ttf|eot|svg|woff)(\\?v=[\\d.]+)?"), loader: "skip"},
      // Binaries.
      {test: /\.(exe|dll)$/, loader: "file"},
    ],
  },
  fileLoader: {
    name: "[name].[ext]",
  },
  plugins: PLUGINS,
};
