"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Cleans the working directory by removing all files.
 *
 * @return {Promise<void>} A promise that resolves when the working directory is cleaned.
 */
async function cleanWorkingDirectory() {
  const currentPath = path.join(process.cwd(), "/npm/@libgs");
  const files = await fs.readdir(currentPath);
  for (const file of files) {
    await fs.rm(path.join(currentPath, file), {
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
  const packageJson = {
    name: "@libgs/",
    version: "1.0",
    description: "",
    main: "index.js",
    scripts: {
      postinstall: "node postinstall.js",
    },
    os: [""],
    cpu: [""],
    libc: [""],
    dependencies: { tar: "^7.2.0" },
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

  const supportedPlatforms = new Map([
    ["darwin", ["aarch64", "x64"]],
    ["linux", ["x64", "arm64", "armv7"]],
    ["linux-musl", ["x64", "arm64"]],
    ["win32", ["x64", "x86"]],
  ]);

  await fs.mkdir(path.join(process.cwd(), "npm", "@libgs"), {
    recursive: true,
  });

  process.stdout.write("Cleaning working directory...\n");
  await cleanWorkingDirectory();

  process.stdout.write("Populating working directory...\n");
  process.chdir(path.join(process.cwd(), "npm", "@libgs"));
  await Promise.all(
    Array.from(supportedPlatforms.entries()).flatMap(([platform, archs]) =>
      archs.map(async (arch) => {
        const currentDir = `${platform}-${arch}`;
        process.stdout.write(`Working on ${currentDir}\n`);
        await fs.mkdir(path.join(process.cwd(), currentDir), {
          recursive: true,
        });

        const currentPackageJson = {
          ...packageJson,
          name: `@libgs/${currentDir}`,
          arch,
          os: [platform],
        };
        await fs.writeFile(
          path.join(process.cwd(), currentDir, "package.json"),
          JSON.stringify(currentPackageJson, null, 2)
        );
        await fs.writeFile(
          path.join(process.cwd(), currentDir, "index.js"),
          indexJS
        );
        await fs.writeFile(
          path.join(process.cwd(), currentDir, "postinstall.js"),
          postInstallJS
        );
      })
    )
  );
}

makePackages().catch((err) => {
  console.error(err);
  process.exit(1);
});
