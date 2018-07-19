const assert = require("assert");
const path = require("path");
const { DefinePlugin } = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const BORAM_DEBUG = process.env.NODE_ENV !== "production";

const BORAM_PLATFORM = process.env.BORAM_PLATFORM || "lin64";
const BORAM_X64_BUILD = BORAM_PLATFORM.endsWith("64");
const BORAM_WIN_BUILD = BORAM_PLATFORM.startsWith("win");
const BORAM_MAC_BUILD = BORAM_PLATFORM.startsWith("mac");
const BORAM_LIN_BUILD = BORAM_PLATFORM.startsWith("lin");
assert(BORAM_WIN_BUILD || BORAM_MAC_BUILD || BORAM_LIN_BUILD,
       "Unknown platform");

module.exports = {
  mode: BORAM_DEBUG ? "none" : "production",
  stats: {
    children: false,
    entrypoints: false,
    modules: false,
  },
  // Exit with code on errors.
  bail: !BORAM_DEBUG,
  // Make electron's virtual modules work.
  target: "electron-main",
  node: {
    // Don't mess with node's dirname variable.
    __dirname: false,
  },
  externals: [
    // Brings tons of useless code.
    {"pretty-error": "Error"},
  ],
  entry: {
    index: "./src/index/index",
    renderer: "./src/index/renderer",
  },
  output: {
    path: path.join(__dirname, "dist", "app"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(html|png|ico|ttf|exe|zip|dll|dylib)$/,
        loader: "file-loader",
        options: {name: "[name].[ext]"},
        exclude: /node_modules/,
      },
      {
        test: /bin[/\\]mac64[/\\][^.]+$/,
        loader: "file-loader",
        options: {name: "[name]"},
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
        include: /font-awesome/,
      },
      {
        test: /\.woff2(\?v=[\d.]+)?$/,
        loader: "file-loader",
        options: {name: "[name].[ext]"},
        include: /font-awesome/,
      },
      {
        test: /\.(ttf|eot|svg|woff)(\?v=[\d.]+)?$/,
        use: "skip-loader",
        include: /font-awesome/,
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      BORAM_DEBUG,
      BORAM_X64_BUILD,
      BORAM_WIN_BUILD,
      BORAM_MAC_BUILD,
      BORAM_LIN_BUILD,
    }),
    new MiniCssExtractPlugin({filename: "index.css"}),
  ],
};
