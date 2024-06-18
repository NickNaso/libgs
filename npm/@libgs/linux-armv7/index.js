'use strict';
const fs = require("node:fs")

module.exports = async function getLibGSPath() {
  const fileList = [];
  const fileExtensions = [".dylib", ".so", ".a", ".dll"];

  const files = await fs.promises.readdir(__dirname);
  for (const file of files) {
    if (fileExtensions.some(ext => file.endsWith(ext))) {
      fileList.push(file);
    }
  }

  return {
    path: __dirname,
    files: fileList
  };
}