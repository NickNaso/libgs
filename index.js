'use strict';

const { createWriteStream, createReadStream } = require('node:fs');
const { unlink, mkdir, rm } = require('node:fs/promises');
const { Readable } = require('node:stream');
const tar = require('tar');
const { spawn } = require('node:child_process');
const { parseArgs } = require('node:util');
const  os  = require('os')

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

    process.stdout.write(`Configuring... \n`);
    let args = ['./configure' ];
    if(targetPlatform === 'darwin' && targetArch === 'arm64') 
      process.env.CFLAGS = `--target=${targetArch}-${targetPlatform}-gnu`;
    if(targetPlatform === 'mingw64'){
       args.push('--without-tesseract');
       await runCommand('rename', ['mingw\\msys\\1.0\\include', 'mingw\\msys\\1.0\\_include']);
    }
    await runCommand('sh', args, { cwd: ghostpdlFolder });

    process.stdout.write(`Building... \n`);
    await runCommand('make', ['libgs'], { cwd: ghostpdlFolder });

    process.stdout.write(`Done.\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch(err => {console.error(err); process.exit(1)})