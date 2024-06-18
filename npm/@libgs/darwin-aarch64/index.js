const { existsSync } = require("fs");
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

async function main(){
  const tarArchive = "gs-*-*.tar.gz";
  if (!existsSync(tarArchive))
    throw new Error(`File ${tarArchive} does not exist.`);
  extractTarGz(tarArchive, "./");
  process.stdout.write(`Extracted ${tarArchive} to ./`);
}

main().catch(err => {console.error(err); process.exit(1)})