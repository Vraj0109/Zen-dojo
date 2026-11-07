// electron-builder hook: copy the bundled server's node_modules into the packaged app.
// extraResources always leaves out node_modules folders, so electron-builder copies the rest of server/
// and this adds server/node_modules. Runs before code signing, so the signature covers it.
const { cpSync, existsSync } = require("node:fs");
const path = require("node:path");

/** @param {{ appOutDir: string, electronPlatformName: string, packager: { appInfo: { productFilename: string } } }} context */
exports.default = async function afterPack(context) {
  const from = path.join(__dirname, "..", "server", "node_modules");
  if (!existsSync(from)) throw new Error(`Missing ${from}; run prepare-server first.`);
  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  cpSync(from, path.join(resources, "server", "node_modules"), { recursive: true });
};
