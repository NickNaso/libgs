"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Cleans the working directory by removing all files.
 *
 * @return {Promise<void>} A promise that resolves when the working directory is cleaned.
 */
async function cleanWorkingDirectory() {
  const files = await fs.readdir(path.join(process.cwd(), '/npm/@libgs'));
  for (const file of files) {
    await fs.rm(path.join(process.cwd(), '/npm/@libgs', file), {
      recursive: true,
      force: true,
    });
  }
}

/**
 * Populates the working directory with directories and files for each supported platform and architecture.
 *
 * @return {Promise<void>} A promise that resolves when the working directory is populated.
 */
async function makePackages() {

  // In linux and onluy on linux we need to add "libc": [""] the dafult is libc and if compiled with musl we need to libc: ["musl"]
  // https://docs.npmjs.com/cli/v10/configuring-npm/package-json
  // https://docs.npmjs.com/cli/v10/using-npm/scripts

  const packageJson = {
    name: "@libgs/",
    version: "1.0",
    description: "",
    mian: "index.js",
    scripts: {
      postinstall: "node postinstall.js",
    },
    os: [""],
    cpu: [""],
    libc: ["glibc or musl"],
    dependencies: {tar: "^6.1.0"},
  };

  const postInstallJS = `
  "use strict";
  const tar = require("tar");
  const fs = require("node:fs/promises");
  const path = require("node:path");
  /**
   * Extracts all .tar.gz files in the current working directory.
   * @returns {Promise<void>} A promise that resolves when the extraction is complete.
   */
  async function unzipArchive() {
    const files = await fs.readdir(process.cwd());
    const archiveFiles = files.filter((file) => file.endsWith(".tar.gz"));
    for (const file of archiveFiles) {
      tar.extract({
        file: path.join(process.cwd(), file),
        cwd: process.cwd(),
      });
    }
  }

  unzipArchive().catch((err) => {
    console.error(err);
    process.exit(1);
  });
`;

  const indexJS = `
  "use strict";
  const fs = require("node:fs");

  /**
   * Gets the path to the libgs library.
   * @returns {Promise<{path: string, files: string[]}>} A promise that resolves with the path to the libgs library.
   */
  module.exports = async function getLibGSPath() {
    const fileList = [];
    const fileExtensions = [".dylib", ".so", ".a", ".dll"];

    const files = await fs.promises.readdir(__dirname);
    for (const file of files) {
      if (fileExtensions.some((ext) => file.endsWith(ext))) {
        fileList.push(file);
      }
    }

    return {
      path: __dirname,
      files: fileList,
    };
  };
`;

  // che ne dici di usare Map? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  const supportedPlatforms = {
    darwin: ["aarch64", "x64"],
    linux: ["x64", "arm64", "armv7"],
    // musl
    win32: ["x64", "x86"],
  };

  process.stdout.write("Cleaning working directory...\n");
  await cleanWorkingDirectory();

  process.stdout.write("Populating working directory...\n");
  for (const [platform, archs] of Object.entries(supportedPlatforms)) {
    for (const arch of archs) {
      const currentDir = `${platform}-${arch}`;
      process.stdout.write(`Working on ${currentDir}\n`);
      await fs.mkdir(path.join(process.cwd(), currentDir), { recursive: true });

      packageJson.name = `@libgs/${currentDir}`;
      packageJson.arch = arch;
      packageJson.os = [platform];
      await fs.writeFile(
        path.join(process.cwd(), currentDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      await fs.writeFile(
        path.join(process.cwd(), currentDir, "index.js"),
        indexJS
      );
      await fs.writeFile(
        path.join(process.cwd(), currentDir, "postinstall.js"),
        postInstallJS
      );
    }
  }
}

makePackages()
.catch((err) => {
  console.error(err);
  process.exit(1);
});
