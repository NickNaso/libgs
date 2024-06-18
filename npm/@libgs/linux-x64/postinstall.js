'use strict';
const tar = require('tar');
const fs = require('node:fs/promises');
const path = require('node:path');
async function unzipArchive() {
  const files = await fs.readdir(process.cwd());
  const archiveFiles = files.filter(file => file.endsWith('.tar.gz'));
  for (const file of archiveFiles) {
    tar.extract({
      file: path.join(process.cwd(), file),
      cwd: process.cwd()
    });
  }
}

unzipArchive().catch((err) => {
  console.error(err);
  process.exit(1);
})