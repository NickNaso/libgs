"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

// The packages created by make.js.
const npmDir = path.join(__dirname, "npm");

async function main() {
  const files = await fs.readdir(".");
  for (const file of files) {
    if (file.startsWith("ghostpdl-") && file.endsWith(".tar.gz")) {
      await fs.unlink(file);
    } else if (file === "ghostpdl") {
      await fs.rm(file, { recursive: true, force: true });
    }
  }
  // Empties the npm directory, if it exists, and keeps it.
  const npmFiles = await fs.readdir(npmDir).catch((err) => {
    if (err.code === "ENOENT") return [];
    throw err;
  });
  for (const file of npmFiles) {
    await fs.rm(path.join(npmDir, file), { recursive: true, force: true });
  }
}
main().catch((err) => console.error(err));
