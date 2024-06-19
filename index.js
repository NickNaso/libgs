"use strict";

const { createWriteStream, createReadStream } = require("node:fs");
const { unlink, mkdir, rm } = require("node:fs/promises");
const { Readable } = require("node:stream");
const tar = require("tar");
const { spawn } = require("node:child_process");
const { parseArgs } = require("node:util");
const os = require("os");

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
    };

    const { values } = parseArgs({
      options: options,
      strict: true,
    });

    let gsRelease = `gs10031`;
    let gsDownloadFile = `ghostpdl-10.03.1.tar.gz`;
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

    switch (targetPlatform) {
      case "windows":
        process.stdout.write("Building\n");
        let selArch =
          targetArch === "x64"
            ? "WIN64"
            : targetArch === "x86"
            ? "WIN32"
            : "ARM64";
        await runCommand(
          "nmake",
          ["-f", "psi\\msvc32.mak", `${selArch}=`, "DEVSTUDIO=", "clean"],
          { cwd: ghostpdlFolder }
        );
        await runCommand(
          "nmake",
          ["-f", "psi\\msvc32.mak", `${selArch}=`, "SBR=1", "DEVSTUDIO="],
          { cwd: ghostpdlFolder }
        );
        await runCommand(
          "nmake",
          ["-f", "psi\\msvc32.mak", `${selArch}=`, "DEVSTUDIO=", "bsc"],
          { cwd: ghostpdlFolder }
        );
        break;
      case "linux":
      case "darwin":
        process.stdout.write("Building\n");
        let args = ["./configure"];
        targetArch === "arm64"
          ? (targetArch = "aarch64")
          : (targetArch = targetArch);
        args.push(`--build=${targetArch}-${targetPlatform}-gnu`);
        await runCommand("sh", args, { cwd: ghostpdlFolder });
        await runCommand("make", ["libgs"], { cwd: ghostpdlFolder });
        break;
      default:
        throw `Unknown platform: ${targetPlatform}\n`;
    }

    process.stdout.write(`Done.\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
