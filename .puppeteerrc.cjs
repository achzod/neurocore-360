/**
 * Puppeteer : Chrome est stocké DANS le projet (.cache/puppeteer).
 *
 * Sur Render, tout ce qui est écrit hors du dossier du projet pendant le build
 * (dont le cache par défaut /opt/render/.cache/puppeteer) n'existe plus au
 * runtime. C'est ce qui faisait échouer les PDF FormCheck le 15/11/2026 :
 * « Could not find Chrome (ver. 143.0.7499.169) ».
 */
const { join } = require("path");

module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
