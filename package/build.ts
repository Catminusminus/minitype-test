import { LogLevel, build } from "esbuild";

import packageJson from "./package.json" assert { type: "json" };

const entry = "src/index.ts";

const settings = {
  bundle: true,
  entryPoints: [entry],
  external: Object.keys(packageJson.dependencies),
  minify: true,
  sourcemap: true,
};

// TODO: ブラウザ用にビルド

build({
  ...settings,
  format: "esm",
  outfile: "./dist/index.esm.js",
  target: ["ES6"],
  platform: "node",
});
