import { expect, test } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";

const files = await fs.readdir("builds");
// Each build artifact is downloaded to a directory named after it, e.g.
// builds/gs-linux-x64.tar.gz/gs-linux-x64.tar.gz.
const archives = (await fs.readdir("builds", { recursive: true }))
  .filter((file) => file.endsWith(".tar.gz"))
  .map((file) => path.join("builds", file));

test("Check if all the file exists", async () => {
  expect(files.length).toBeGreaterThan(0);
});

test("Ensure all files in the 'builds' directory have a positive size", async () => {
  for (const file of files) {
    const stat = await fs.stat(`builds/${file}`);
    expect(stat.size).toBeGreaterThan(0);
  }
});

test("Ensure all archives contain the headers of the Ghostscript API", async () => {
  for (const archive of archives) {
    if (!(await fs.stat(archive)).isFile()) continue;
    const entries = [];
    await tar.t({
      file: archive,
      onReadEntry: (entry) => entries.push(entry.path.replace(/^\.\//, "")),
    });
    for (const header of ["iapi.h", "ierrors.h", "gserrors.h", "gdevdsp.h"]) {
      expect(entries, archive).toContain(`ghostpdl/include/${header}`);
    }
  }
});
