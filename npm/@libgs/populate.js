'use strict';
const fs = require('node:fs').promises;
const path = require('node:path'); 

const supportedPlatforms = {
  darwin: ['aarch64', 'x64'],
  linux: ['x64', 'arm64', 'armv7'],
  win32: ['x64','x86'],
};

const cleanWorkingDirectory = async () => {
  const files = await fs.readdir(process.cwd());
  await Promise.all(files.map(async (file) => {
    if (file === 'template' || file === 'populate.js') return; 
    await fs.rm(path.join(process.cwd(), file), { recursive: true, force: true });
  }));
}

const copyTemplateFiles = async (destination) => {
  const templateDir = path.join(__dirname, 'template');
  const templateFiles = await fs.readdir(templateDir);
  await Promise.all(templateFiles.map(async (file) => {
    await fs.copyFile(path.join(templateDir, file), path.join(process.cwd(), destination, file));
  }));
}

const populate = async () => {
  await cleanWorkingDirectory(); 

  await fs.mkdir(process.cwd(), { recursive: true });
  for (const [platform, archs] of Object.entries(supportedPlatforms)) {
    for (const arch of archs) {
      const currentDir = `${platform}-${arch}` 
      await fs.mkdir(path.join(process.cwd(), currentDir), { recursive: true });
      await copyTemplateFiles(currentDir);
    }
  }
}

populate().catch((err) => {
  console.error(err);
  process.exit(1);
});

