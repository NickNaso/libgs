'use strict';

const { createWriteStream, createReadStream } = require('node:fs');
const { unlink, mkdir, rm } = require('node:fs/promises');
const { Readable } = require('node:stream');
const tar = require('tar');
const { spawn } = require('node:child_process');
const { parseArgs } = require('node:util');
const  os  = require('os');

async function downloadFile(url, filePath) {
  try {
    const res = await fetch(url);
    const wGSDownload = createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      const rGSDownload = Readable.fromWeb(res.body);
      rGSDownload.pipe(wGSDownload);
      rGSDownload.on('end', resolve);
      rGSDownload.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to download ${filePath}: ${error.message}`);
  }
}

async function createDirectory(directoryPath) {
  try {
    await mkdir(directoryPath);
  } catch (error) {
    throw new Error(`Failed to create directory ${directoryPath}: ${error.message}`);
  }
}

async function extractTarGz(tarGzPath, destinationPath) {
  try {
    const rGSTarGz = createReadStream(tarGzPath);
    const wGSTarGz = tar.x({
      strip: 1,
      C: destinationPath,
    });
    await new Promise((resolve, reject) => {
      rGSTarGz.pipe(wGSTarGz);
      wGSTarGz.on('finish', resolve);
      wGSTarGz.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to extract ${tarGzPath}: ${error.message}`);
  }
}

async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, options);
    childProcess.stdout.on('data', (data) => {
      process.stdout.write(`${data}`)
    });
    childProcess.stderr.on('data', (data) => {
      process.stderr.write(`${data}`)
    });
    childProcess.on('close', (code) => {
      if (code !== 0) reject(new Error(`${command} exited with code ${code}`));
      resolve();
    });
  });
}

async function main() {
  try {

    const options = {
      release: {
        type: 'string',
        description: 'Release version',
        short: 'r',
        long: 'release',
      },
      arch: {
        type: 'string',
        description: 'Architecture',
        short: 'a',
        long: 'arch',
      },
      platform: {
        type: 'string',
        description: 'Platform',
        short: 'p',
        long: 'platform',
      }
    }

    const { values } = parseArgs({
      options: options,
      strict: true,
    });

    let gsRelease = `gs10031`;
    let gsDownloadFile = `ghostpdl-10.03.1.tar.gz`;
    let gsDownload = `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/${gsRelease}/${gsDownloadFile}`;
    const ghostpdlFolder = 'ghostpdl'

    let targetArch;
    let targetPlatform;
    values.platform ? targetPlatform = values.platform : targetPlatform = (os.platform());
    values.arch ? targetArch = values.arch : targetArch = os.arch();
 
    if (values.release) {
      gsRelease = `gs${values.release.replace(/\./g, '')}`;
      gsDownloadFile = `ghostpdl-${values.release}.tar.gz`;
      gsDownload = `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/${gsRelease}/${gsDownloadFile}`;
    }

    process.stdout.write("Cleaning up... \n");
    await unlink(gsDownloadFile).catch(() => {});
    await rm('ghostpdl', { recursive: true, force: true }).catch(() => {});

    process.stdout.write(`Downloading ${gsDownloadFile}... \n`);
    await downloadFile(gsDownload, gsDownloadFile);

    process.stdout.write(`Extracting ${gsDownloadFile}... \n`);
    await createDirectory(ghostpdlFolder);
    await extractTarGz(gsDownloadFile, ghostpdlFolder);

    switch (targetPlatform) {
      case 'windows':
        process.stdout.write('Building\n')
        await runCommand("nmake", ["-f","psi\\msvc32.mak","WIN64=","DEVSTUDIO=","clean"], { cwd: ghostpdlFolder });
        await runCommand("nmake", ["-f","psi\\msvc32.mak","WIN64=","SBR=1","DEVSTUDIO="], { cwd: ghostpdlFolder });
        await runCommand("nmake", ["-f","psi\\msvc32.mak","WIN64=","DEVSTUDIO=","bsc"], { cwd: ghostpdlFolder });
        break;
      case 'linux':
      case 'darwin':
        process.stdout.write('Building\n')
        let args = ["./configure"];
        if (targetArch === "arm64")
          process.env.CFLAGS = `--target=${targetArch}-${targetPlatform}-gnu`;
        await runCommand("sh", args, { cwd: ghostpdlFolder });
        await runCommand("make", ["libgs"], { cwd: ghostpdlFolder });
        break;
      default:
        throw `Unknown platform: ${targetPlatform}\n`;
        break;
    }

    process.stdout.write(`Done.\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch(err => {console.error(err); process.exit(1)})