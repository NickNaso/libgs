"use strict";

const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { parseArgs } = require("node:util");
const tar = require("tar");

const repository = "NickNaso/libgs";
const packagesDir = path.join(__dirname, "npm", "@libgs");

// The platforms of Node.js (BUILDING.md in nodejs/node) that Ghostscript can
// be built for, plus armv6, Raspberry Pi OS and Alpine's armhf baseline.
const supportedPlatforms = new Map([
  ["darwin", ["aarch64", "x64"]],
  ["freebsd", ["x64"]],
  [
    "linux",
    ["x64", "arm64", "armv6", "armv7", "ia32", "ppc64", "s390x", "loong64", "riscv64"],
  ],
  ["linux-musl", ["x64", "arm64", "armv6", "armv7"]],
  ["win32", ["x64", "x86", "arm64"]],
]);

// The package names keep the historical architecture names, while npm
// matches the os, cpu and libc fields against process.platform,
// process.arch and the detected libc.
const npmArchs = new Map([
  ["aarch64", "arm64"],
  ["armv6", "arm"],
  ["armv7", "arm"],
  ["x86", "ia32"],
]);
const platformFields = new Map([
  ["darwin", { os: ["darwin"] }],
  ["freebsd", { os: ["freebsd"] }],
  ["linux",{ os: ["linux"], libc: ["glibc"] }],
  ["linux-musl", { os: ["linux"], libc: ["musl"] }],
  ["win32", { os: ["win32"] }],
]);

// Only the libraries are published: the archives also contain executables
// and, for shared libraries, symbolic links, which npm does not pack.
const libraryPattern = /\.(a|lib|dll|dylib)$|\.so(\.\d+)*$/;
const headerPattern = /\.h$/;

// The keywords of every package, which also gets the ones of its architecture.
const keywords = [
  "nodejs",
  "ghostscript",
  "native",
  "addon",
  "pdf",
  "eps",
  "ps",
  "cpp",
];

/**
 * Gets a release of the repository from the GitHub API.
 * GITHUB_TOKEN, when set, raises the rate limit of the API.
 *
 * @param {string} [tag] - The tag of the release, the latest release when omitted.
 * @return {Promise<Object>} A promise that resolves with the release.
 * @throws {Error} If the release cannot be fetched.
 */
async function getRelease(tag) {
  const url = tag
    ? `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`
    : `https://api.github.com/repos/${repository}/releases/latest`;
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to get the release from ${url}: ${res.status}`);
  }
  return res.json();
}

/**
 * Downloads a release asset and checks it against the size and the SHA-256
 * digest reported by GitHub.
 *
 * @param {Object} asset - The release asset, as returned by the GitHub API.
 * @param {string} filePath - The path where the asset will be saved.
 * @return {Promise<void>} A promise that resolves when the asset is saved.
 * @throws {Error} If the download fails or the asset does not match.
 */
async function downloadAsset(asset, filePath) {
  const res = await fetch(asset.browser_download_url);
  if (!res.ok) {
    throw new Error(`Failed to download ${asset.name}: ${res.status}`);
  }
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length !== asset.size) {
    throw new Error(
      `${asset.name} is ${data.length} bytes, the release reports ${asset.size}`
    );
  }
  // Older releases have no digest.
  if (asset.digest) {
    const digest = `sha256:${createHash("sha256").update(data).digest("hex")}`;
    if (digest !== asset.digest) {
      throw new Error(`${asset.name} does not match ${asset.digest}`);
    }
  }
  await fs.writeFile(filePath, data);
}

/**
 * Extracts the files of a ghostpdl folder of an archive built by index.js:
 * the libraries are in ghostpdl/bin and the headers in ghostpdl/include.
 *
 * @param {string} archivePath - The path of the .tar.gz archive.
 * @param {string} folder - The folder in ghostpdl, e.g. bin.
 * @param {RegExp} pattern - The pattern of the names of the files to extract.
 * @param {string} destinationPath - The directory where the files will be saved.
 * @return {Promise<string[]>} A promise that resolves with the names of the extracted files.
 * @throws {Error} If the folder contains no matching file.
 */
async function extractFiles(archivePath, folder, pattern, destinationPath) {
  const files = [];
  const entryPattern = new RegExp(`^(?:\\./)?ghostpdl/${folder}/([^/]+)$`);
  await fs.mkdir(destinationPath, { recursive: true });
  await tar.x({
    file: archivePath,
    cwd: destinationPath,
    strip: 2,
    filter: (entryPath, entry) => {
      const match = entryPattern.exec(entryPath);
      const keep =
        entry.type === "File" && match !== null && pattern.test(match[1]);
      if (keep) files.push(match[1]);
      return keep;
    },
  });
  if (files.length === 0) {
    throw new Error(
      `${path.basename(archivePath)} has no file matching ${pattern} in ghostpdl/${folder}`
    );
  }
  return files.sort();
}

/**
 * Writes the package.json, the index.js and the README.md of a platform
 * package.
 * The package has no install scripts: the libraries are already in it, and
 * npm installs only the package matching the os, cpu and libc fields.
 *
 * @param {string} packageDir - The directory of the package.
 * @param {string} platform - The platform, a key of supportedPlatforms.
 * @param {string} arch - The architecture in the package name.
 * @param {string} version - The version of the package.
 * @param {string[]} files - The names of the libraries in the lib directory.
 * @param {string[]} headers - The names of the headers in the include directory.
 * @return {Promise<void>} A promise that resolves when the files are written.
 */
async function writePackageFiles(
  packageDir,
  platform,
  arch,
  version,
  files,
  headers
) {
  const description = `Ghostscript library (libgs) for ${platform} ${arch}`;
  const cpu = npmArchs.get(arch) ?? arch;
  const packageJson = {
    name: `@libgs/${platform}-${arch}`,
    version,
    description,
    // The architecture of the package name, and the one of npm when it
    // differs, e.g. aarch64 and arm64.
    keywords: [...keywords, ...new Set([arch, cpu])],
    repository: {
      type: "git",
      url: `git+https://github.com/${repository}.git`,
    },
    main: "index.js",
    // npm always packs the README.md and the package.json.
    files: ["index.js", "lib", "include"],
    // Yarn Plug'n'Play leaves the libraries on disk instead of in a zip.
    preferUnplugged: true,
    ...platformFields.get(platform),
    cpu: [cpu],
  };
  const indexJS = `"use strict";
const path = require("node:path");

/**
 * The libgs library and its headers.
 * @type {{path: string, files: string[], include: string, headers: string[]}}
 * The directory of the libraries and their names, and the directory of the
 * headers and their names.
 */
module.exports = {
  path: path.join(__dirname, "lib"),
  files: ${JSON.stringify(files)},
  include: path.join(__dirname, "include"),
  headers: ${JSON.stringify(headers)},
};
`;
  await fs.writeFile(
    path.join(packageDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`
  );
  await fs.writeFile(path.join(packageDir, "index.js"), indexJS);
  await fs.writeFile(
    path.join(packageDir, "README.md"),
    `# libgs\n\n${description}.\n\nSee the [libgs repository](https://github.com/${repository}#readme) for how to use it.\n`
  );
}

/**
 * Creates a package in npm/@libgs for each supported platform and
 * architecture whose archive (gs-<platform>-<arch>.tar.gz) is in the release.
 *
 * @return {Promise<void>} A promise that resolves when the packages are created.
 * @throws {Error} If the release has none of the archives.
 */
async function makePackages() {
  const { values } = parseArgs({
    options: {
      // The release tag, e.g. v0.0.14; the latest release when omitted.
      tag: { type: "string", short: "t" },
      // The version of the packages; the tag without the leading v when omitted.
      version: { type: "string" },
    },
    strict: true,
  });

  const release = await getRelease(values.tag);
  const version = values.version ?? release.tag_name.replace(/^v/, "");
  const assets = new Map(release.assets.map((asset) => [asset.name, asset]));
  process.stdout.write(
    `Creating the packages ${version} from the release ${release.tag_name}\n`
  );

  process.stdout.write("Cleaning working directory...\n");
  await fs.rm(packagesDir, { recursive: true, force: true });
  await fs.mkdir(packagesDir, { recursive: true });

  const downloadDir = await fs.mkdtemp(path.join(os.tmpdir(), "libgs-"));
  try {
    const created = await Promise.all(
      Array.from(supportedPlatforms.entries()).flatMap(([platform, archs]) =>
        archs.map(async (arch) => {
          const name = `${platform}-${arch}`;
          const asset = assets.get(`gs-${name}.tar.gz`);
          if (!asset) {
            process.stdout.write(
              `Skipping @libgs/${name}: the release has no gs-${name}.tar.gz\n`
            );
            return false;
          }
          process.stdout.write(`Working on @libgs/${name}\n`);
          const archivePath = path.join(downloadDir, asset.name);
          await downloadAsset(asset, archivePath);
          const packageDir = path.join(packagesDir, name);
          const files = await extractFiles(
            archivePath,
            "bin",
            libraryPattern,
            path.join(packageDir, "lib")
          );
          const headers = await extractFiles(
            archivePath,
            "include",
            headerPattern,
            path.join(packageDir, "include")
          );
          await writePackageFiles(
            packageDir,
            platform,
            arch,
            version,
            files,
            headers
          );
          return true;
        })
      )
    );
    if (!created.includes(true)) {
      throw new Error(
        `The release ${release.tag_name} has no gs-<platform>-<arch>.tar.gz archive`
      );
    }
  } finally {
    await fs.rm(downloadDir, { recursive: true, force: true });
  }
}

makePackages().catch((err) => {
  console.error(err);
  process.exit(1);
});
