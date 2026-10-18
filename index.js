"use strict";

const { createWriteStream, createReadStream } = require("node:fs");
const { unlink, mkdir, rm, writeFile, copyFile } = require("node:fs/promises");
const { Readable } = require("node:stream");
const tar = require("tar");
const { spawn } = require("node:child_process");
const { parseArgs } = require("node:util");
const os = require("os");
const path = require("node:path");

/**
 * Downloads a file from the given URL and saves it to the specified file path.
 *
 * @param {string} url - The URL of the file to download.
 * @param {string} filePath - The path where the downloaded file will be saved.
 * @return {Promise<void>} A promise that resolves when the download is complete.
 * @throws {Error} If the download fails for any reason.
 */
async function downloadFile(url, filePath) {
  try {
    const res = await fetch(url);
    const wGSDownload = createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      const rGSDownload = Readable.fromWeb(res.body);
      rGSDownload.pipe(wGSDownload);
      rGSDownload.on("end", resolve);
      rGSDownload.on("error", reject);
    });
  } catch (error) {
    throw new Error(`Failed to download ${filePath}: ${error.message}`);
  }
}

/**
 * Creates a directory at the specified path.
 *
 * @param {string} directoryPath - The path where the directory will be created.
 * @return {Promise<void>} A promise that resolves when the directory is created.
 */
async function createDirectory(directoryPath) {
  try {
    await mkdir(directoryPath);
  } catch (error) {
    throw new Error(
      `Failed to create directory ${directoryPath}: ${error.message}`
    );
  }
}

/**
 * Extracts a .tar.gz file to the specified destination directory.
 *
 * @param {string} tarGzPath - The path of the .tar.gz file to extract.
 * @param {string} destinationPath - The path where the extracted files will be saved.
 * @return {Promise<void>} A promise that resolves when the extraction is complete.
 * @throws {Error} If the extraction fails for any reason.
 */
async function extractTarGz(tarGzPath, destinationPath) {
  try {
    const rGSTarGz = createReadStream(tarGzPath);
    const wGSTarGz = tar.x({
      strip: 1,
      C: destinationPath,
    });
    await new Promise((resolve, reject) => {
      rGSTarGz.pipe(wGSTarGz);
      wGSTarGz.on("finish", resolve);
      wGSTarGz.on("error", reject);
    });
  } catch (error) {
    throw new Error(`Failed to extract ${tarGzPath}: ${error.message}`);
  }
}

/**
 * Runs a command asynchronously and returns a promise that resolves when the command completes.
 *
 * @param {string} command - The command to run.
 * @param {Array} args - The arguments to pass to the command.
 * @param {Object} options - The options to pass to the child process.
 * @return {Promise<void>} A promise that resolves when the command completes.
 * @throws {Error} If the command exits with a non-zero code.
 */
async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, options);
    childProcess.stdout.on("data", (data) => {
      process.stdout.write(`${data}`);
    });
    childProcess.stderr.on("data", (data) => {
      process.stderr.write(`${data}`);
    });
    childProcess.on("close", (code) => {
      if (code !== 0) reject(new Error(`${command} exited with code ${code}`));
      resolve();
    });
  });
}

/**
 * The headers of the Ghostscript API, the ones installed by make install-so
 * (base/unix-dll.mak), relative to the ghostpdl folder.
 */
const apiHeaders = [
  "psi/iapi.h",
  "psi/ierrors.h",
  "base/gserrors.h",
  "devices/gdevdsp.h",
];

/**
 * Copies the headers of the Ghostscript API to ghostpdl/include and archives
 * that folder together with ghostpdl/bin, which contains the library.
 *
 * @param {string} ghostpdlFolder - The folder containing the ghostpdl sources.
 * @param {string} name - The name of the archive.
 * @return {Promise<void>} A promise that resolves when the archive is written.
 */
async function createArchive(ghostpdlFolder, name) {
  const includeFolder = path.join(ghostpdlFolder, "include");
  await mkdir(includeFolder, { recursive: true });
  for (const header of apiHeaders) {
    await copyFile(
      path.join(ghostpdlFolder, header),
      path.join(includeFolder, path.basename(header))
    );
  }
  await tar.create({ gzip: true, file: name }, [
    path.join(ghostpdlFolder, "bin"),
    includeFolder,
  ]);
}

/**
 * configure options that keep libgs free of system dependencies, so that the
 * static library links without them. Tesseract is C++: it would also require
 * a C++ runtime, and zig c++ uses libc++ instead of the usual libstdc++.
 */
const selfContainedOptions = [
  "--without-x",
  "--disable-cups",
  "--disable-dbus",
  "--disable-gtk",
  "--disable-fontconfig",
  "--without-libidn",
  "--without-libpaper",
  "--without-tesseract",
  "--without-pdftoraster",
];

/**
 * Zig target architectures, mapped to the names used by autoconf (--host)
 * and to the architecture in the @libgs package names, which is the Node.js
 * one (process.arch) except for 32-bit ARM. Zig has no armv6 and armv7
 * architectures: they are arm plus a -mcpu.
 */
// Zig's arm baseline includes NEON, which armv7 distributions (Alpine armv7,
// Debian armhf) do not require: their baseline is armv7-a with VFPv3-D16.
const armv7 = { zig: "arm", mcpu: "generic+v7a+vfp3d16-neon-d32", host: "arm", npm: "armv7" };
const zigArchs = new Map([
  ["x86_64", { host: "x86_64", npm: "x64" }],
  ["x86", { host: "i686", npm: "ia32" }],
  ["aarch64", { host: "aarch64", npm: "arm64" }],
  ["arm", armv7],
  ["armv7", armv7],
  // The Raspberry Pi 1 and Zero CPU, the armv6 baseline of Alpine's armhf.
  ["armv6", { zig: "arm", mcpu: "arm1176jzf_s", host: "arm", npm: "armv6" }],
  ["riscv64", { host: "riscv64", npm: "riscv64" }],
  ["powerpc64le", { host: "powerpc64le", npm: "ppc64" }],
  ["s390x", { host: "s390x", npm: "s390x" }],
  // Zig's loongarch64 baseline includes LSX, which makes libpng call its LSX
  // filters: ghostpdl does not build them (base/png.mak disables the Intel
  // and ARM ones in the same way).
  [
    "loongarch64",
    { host: "loongarch64", npm: "loong64", cflags: ["-DPNG_LOONGARCH_LSX_OPT=0"] },
  ],
]);

/**
 * The nmake macros selecting each Windows architecture. psi\msvc32.mak only
 * selects the word size (WIN32 or WIN64): the instruction set is the one of
 * the compiler on the PATH, so the build must run in a Visual Studio
 * environment of the same architecture (e.g. vcvarsall amd64_x86 for x86).
 */
const windowsArchs = new Map([
  ["x64", ["WIN64="]],
  ["x86", ["WIN32="]],
  // ARM64 has the same data model as x64 (LLP64), but the makefiles assume
  // the x86 SIMD extensions: SSE2 (base/msvcver.mak, which offers
  // DONT_HAVE_SSE2) and those of CAL and Tesseract (psi/msvc.mak). Their code
  // is disabled without them, and Tesseract detects the CPU features at run
  // time.
  [
    "arm64",
    [
      "WIN64=",
      "DONT_HAVE_SSE2=",
      "CAL_CFLAGS=",
      "TESSCXXFLAGS=/EHsc /std:c++17 /utf-8 /wd4244 /wd4305",
    ],
  ],
]);

/**
 * base/msvcver.mak recognises Visual Studio up to 2022 (version 17) and
 * otherwise falls back to the flags of Visual C++ 6: newer versions, such as
 * Visual Studio 2026 (18) on the GitHub runners, are built as 2022.
 */
const msvcVersion = "MSVC_VERSION=17";

/**
 * Parses a Zig target triple, e.g. aarch64-linux-musl, x86_64-linux-gnu.2.17
 * or x86_64-freebsd. The armv6 and armv7 architectures are also accepted,
 * e.g. armv6-linux-musleabihf.
 *
 * @param {string} target - The Zig target triple.
 * @return {{zigTarget: string, zigFlags: string[], host: string, packageName: string}}
 * The triple and the flags for Zig, the autoconf host triple and the package name.
 * @throws {Error} If the target is not supported.
 */
function parseZigTarget(target) {
  // The optional version suffix of the libc (".2.17") or of the operating
  // system (x86_64-freebsd.14.0) is only meaningful to Zig.
  const [arch, platform, abi = ""] = target.split(".")[0].split("-");
  const archNames = zigArchs.get(arch);
  let host;
  let packagePlatform;
  if (archNames && platform === "linux" && /^(gnu|musl)/.test(abi)) {
    host = `${archNames.host}-unknown-linux-${abi}`;
    packagePlatform = abi.startsWith("musl") ? "linux-musl" : "linux";
  } else if (archNames && platform === "freebsd" && abi === "") {
    host = `${archNames.host}-unknown-freebsd`;
    packagePlatform = "freebsd";
  } else {
    throw new Error(`Unsupported Zig target: ${target}`);
  }
  return {
    zigTarget: archNames.zig
      ? target.replace(arch, archNames.zig)
      : target,
    zigFlags: [
      ...(archNames.mcpu ? [`-mcpu=${archNames.mcpu}`] : []),
      ...(archNames.cflags ?? []),
    ],
    host,
    packageName: `${packagePlatform}-${archNames.npm}`,
  };
}

/**
 * Writes shell wrappers around the Zig toolchain for the given target.
 * Some configure scripts (e.g. libtool's) mishandle multi-word tools such as
 * CC="zig cc -target ...", so each tool becomes a single executable path.
 *
 * @param {string} zigTarget - The Zig target triple.
 * @param {string[]} zigFlags - The extra compiler flags for the target, e.g. -mcpu.
 * @param {string} directoryPath - The directory where the wrappers will be written.
 * @return {Promise<Object>} A promise that resolves with the tool variables (CC, AR, ...) and their paths.
 */
async function createZigWrappers(zigTarget, zigFlags, directoryPath) {
  // Of the -Wp,<arg> options zig cc only accepts the dependency ones, but
  // ghostscript compiles freetype with -Wp,-w: pass -w instead.
  // ghostscript also compiles everything with
  // -Werror=declaration-after-statement, which brotli's decoder violates on
  // ARMv7 (BROTLI_HC_MARK_TABLE_FOR_FAST_LOAD): drop it.
  const translateArgs = [
    "for arg; do",
    "  shift",
    "  case \"$arg\" in",
    "    -Wp,-w) set -- \"$@\" -w ;;",
    "    -Werror=declaration-after-statement) ;;",
    "    *) set -- \"$@\" \"$arg\" ;;",
    "  esac",
    "done",
  ].join("\n");
  // zig cc enables UBSan on unoptimized code: the objects would reference
  // __ubsan_* symbols that consumers of the static library cannot resolve.
  // The library is linked into Node.js addons, which are shared libraries:
  // zig cc produces position-independent code by default only for glibc,
  // not for musl or FreeBSD.
  const targetFlags = ["-target", zigTarget, ...zigFlags].join(" ");
  const ccFlags = `${targetFlags} -fno-sanitize=undefined -fPIC`;
  const scripts = {
    CC: `${translateArgs}\nexec zig cc ${ccFlags} "$@"`,
    CXX: `${translateArgs}\nexec zig c++ ${ccFlags} "$@"`,
    AR: "exec zig ar \"$@\"",
    RANLIB: "exec zig ranlib \"$@\"",
    LD: "exec zig ld.lld \"$@\"",
  };
  await mkdir(directoryPath, { recursive: true });
  const tools = {};
  for (const [name, script] of Object.entries(scripts)) {
    tools[name] = path.join(directoryPath, name.toLowerCase());
    await writeFile(tools[name], `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  }
  return tools;
}

/**
 * Cross-compiles libgs with Zig and archives the result.
 * The auxiliary tools run during the build are compiled with the host
 * compiler, which configure detects (or reads from CCAUX).
 *
 * @param {string} target - The Zig target triple, see parseZigTarget.
 * @param {string} ghostpdlFolder - The folder containing the ghostpdl sources.
 * @return {Promise<void>} A promise that resolves when the build is complete.
 */
async function buildWithZig(target, ghostpdlFolder) {
  const { zigTarget, zigFlags, host, packageName } = parseZigTarget(target);
  const tools = await createZigWrappers(
    zigTarget,
    zigFlags,
    path.resolve(ghostpdlFolder, "zig-bin")
  );
  await runCommand(
    "sh",
    [
      "./configure",
      `--host=${host}`,
      ...Object.entries(tools).map(([name, tool]) => `${name}=${tool}`),
      ...selfContainedOptions,
    ],
    { cwd: ghostpdlFolder }
  );
  // The generated Makefile hard-codes AR=ar, ignoring configure.
  await runCommand(
    "make",
    [`-j${os.availableParallelism()}`, `AR=${tools.AR}`, "libgs"],
    { cwd: ghostpdlFolder }
  );
  await createArchive(ghostpdlFolder, `gs-${packageName}.tar.gz`);
}

/**
 * Asynchronously runs the main function.
 *
 * @return {Promise<void>} A promise that resolves when the main function completes.
 * @throws {Error} If there is an error during the execution of the main function.
 */
async function main() {
  try {
    const options = {
      release: {
        type: "string",
        description: "Release version",
        short: "r",
        long: "release",
      },
      arch: {
        type: "string",
        description: "Architecture",
        short: "a",
        long: "arch",
      },
      platform: {
        type: "string",
        description: "Platform",
        short: "p",
        long: "platform",
      },
      zig: {
        type: "string",
        description: "Zig target to cross-compile for, e.g. aarch64-linux-musl",
        short: "z",
        long: "zig",
      },
    };

    const { values } = parseArgs({
      options: options,
      strict: true,
    });

    let gsRelease = "gs10080";
    let gsDownloadFile = "ghostpdl-10.08.0.tar.gz";
    let gsDownload = `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/${gsRelease}/${gsDownloadFile}`;
    const ghostpdlFolder = "ghostpdl";

    let targetArch;
    let targetPlatform;
    values.platform
      ? (targetPlatform = values.platform)
      : (targetPlatform = os.platform());
    values.arch ? (targetArch = values.arch) : (targetArch = os.arch());

    if (values.release) {
      gsRelease = `gs${values.release.replace(/\./g, "")}`;
      gsDownloadFile = `ghostpdl-${values.release}.tar.gz`;
      gsDownload = `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/${gsRelease}/${gsDownloadFile}`;
    }

    process.stdout.write("Cleaning up... \n");
    await unlink(gsDownloadFile).catch(() => {});
    await rm("ghostpdl", { recursive: true, force: true }).catch(() => {});

    process.stdout.write(`Downloading ${gsDownloadFile}... \n`);
    await downloadFile(gsDownload, gsDownloadFile);

    process.stdout.write(`Extracting ${gsDownloadFile}... \n`);
    await createDirectory(ghostpdlFolder);
    await extractTarGz(gsDownloadFile, ghostpdlFolder);

    switch (values.zig ? "zig" : targetPlatform) {
      case "zig":
        process.stdout.write(`Building for ${values.zig} with Zig\n`);
        await buildWithZig(values.zig, ghostpdlFolder);
        break;
      case "windows": {
        process.stdout.write("Building\n");
        const nmakeArchs = windowsArchs.get(targetArch);
        if (!nmakeArchs) {
          throw new Error(`Unsupported Windows architecture: ${targetArch}`);
        }
        const nmake = [
          "-f",
          "psi\\msvc32.mak",
          ...nmakeArchs,
          msvcVersion,
          "DEVSTUDIO=",
        ];
        await runCommand("nmake", [...nmake, "clean"], { cwd: ghostpdlFolder });
        await runCommand("nmake", [...nmake, "SBR=1"], { cwd: ghostpdlFolder });
        await runCommand("nmake", [...nmake, "bsc"], { cwd: ghostpdlFolder });
        await createArchive(ghostpdlFolder, `gs-win32-${targetArch}.tar.gz`);
        break;
      }
      case "linux":
      case "darwin":
        process.stdout.write("Building\n");
        const args = ["./configure"];
        targetArch === "arm64"
          ? (targetArch = "aarch64")
          : (targetArch = targetArch);
        args.push(`--build=${targetArch}-${targetPlatform}-gnu`);
        // Native builds also pick up libraries installed on the runner, e.g.
        // Homebrew's fontconfig on macOS, which breaks the auxiliary tools.
        args.push(...selfContainedOptions);
        await runCommand("sh", args, { cwd: ghostpdlFolder });
        await runCommand("make", ["libgs"], { cwd: ghostpdlFolder });
        await createArchive(
          ghostpdlFolder,
          `gs-${targetPlatform}-${targetArch}.tar.gz`
        );
        break;
      default:
        throw `Unknown platform: ${targetPlatform}\n`;
    }

    process.stdout.write("Done.\n");
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
