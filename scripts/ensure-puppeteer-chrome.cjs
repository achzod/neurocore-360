#!/usr/bin/env node
/**
 * Installe le Chrome de puppeteer dans .cache/puppeteer (voir .puppeteerrc.cjs)
 * pendant le build. npm install ne relance pas le postinstall de puppeteer
 * quand node_modules est déjà présent (cache Render), d'où ce script idempotent.
 *
 * PUPPETEER_SKIP_DOWNLOAD=1 ou SKIP_PUPPETEER_CHROME_INSTALL=1 le désactive
 * (développement local, CI sans PDF). Un échec n'arrête pas le build : le
 * worker FormCheck relance et, en dernier recours, livre le rapport en HTML.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const skip = ["PUPPETEER_SKIP_DOWNLOAD", "SKIP_PUPPETEER_CHROME_INSTALL"].some((key) => {
  const value = String(process.env[key] || "").trim().toLowerCase();
  return value && !["0", "false", "no", "off"].includes(value);
});
if (skip) {
  console.log("[puppeteer] installation de Chrome ignorée (variable de skip).");
  process.exit(0);
}

let cli;
try {
  cli = require.resolve("puppeteer/lib/cjs/puppeteer/node/cli.js", { paths: [process.cwd()] });
} catch {
  console.warn("[puppeteer] puppeteer introuvable dans node_modules, installation de Chrome ignorée.");
  process.exit(0);
}

const result = spawnSync(process.execPath, [cli, "browsers", "install", "chrome"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
});
if (result.status !== 0) {
  console.warn(`[puppeteer] installation de Chrome échouée (code ${result.status}). Les PDF FormCheck basculeront en HTML.`);
}
process.exit(0);
