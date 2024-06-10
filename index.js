'use strict';

const { createWriteStream, createReadStream } = require('node:fs');
const { unlink, mkdir, rm } = require('node:fs/promises');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const tar = require('tar');
const { spawn } = require('node:child_process');

const gsRelease = 'gs10031'
const gsDownloadFile = 'ghostpdl-10.03.1.tar.gz'
const gsDownload = `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/${gsRelease}/${gsDownloadFile}`;
const ghostpdlFolder = 'ghostpdl'

async function main() {
    await unlink(gsDownloadFile).catch(() => {})
    await rm('ghostpdl', {recursive: true, force: true}).catch(() => {})
    const res = await fetch(gsDownload)
    const wGSDownload = createWriteStream(gsDownloadFile);
    const rGSDownload = Readable.fromWeb(res.body)
    await pipeline(rGSDownload, wGSDownload)
    await mkdir(ghostpdlFolder)
    const rGSTarGz = createReadStream(gsDownloadFile)
    const wGSTarGz = tar.x({
        strip: 1,
        C: ghostpdlFolder,
    })
    await pipeline(rGSTarGz, wGSTarGz)
    
    const configure = spawn('sh', ['configure'], {cwd: ghostpdlFolder})
    configure.stdout.on('data', (data) => {
        process.stdout.write(`${data}`);
        // console.log(`${data}`);
      });
      
      configure.stderr.on('data', (data) => {
        console.error(`${data}`);
      });
      
      configure.on('close', (code) => {
        console.log(`bla bla bla${code}`);
        if (code ===0) {
            const make = spawn('sh', ['make libgs'], {cwd: ghostpdlFolder})
            make.stdout.on('data', (data) => {
                process.stdout.write(`${data}`);
                // console.log(`${data}`);
              });
              
              make.stderr.on('data', (data) => {
                console.error(`${data}`);
              });
              
              make.on('close', (code) => {
                console.log(`bla bla bla${code}`);
              });
        }
      });
}

main().catch(err => {console.error(err); process.exit(1)})