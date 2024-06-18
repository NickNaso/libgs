const fs = require('node:fs/promises')  
async function main () {  
  const files = await fs.readdir('.');
  for (const file of files) {
    if (file.startsWith('ghostpdl-') && file.endsWith('.tar.gz')) {
      await fs.unlink(file);
    } else if (file === 'ghostpdl') {
      await fs.rm(file, { recursive: true, force: true });
    }
  }
}  
main().catch(err => console.error(err)) 