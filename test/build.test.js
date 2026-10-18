import { expect, test } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";

const files = await fs.readdir("builds");
// Each build artifact is downloaded to a directory named after it, e.g.
// builds/gs-linux-x64.tar.gz/gs-linux-x64.tar.gz.
const archives = [];
for (const file of await fs.readdir("builds", { recursive: true })) {
  const archive = path.join("builds", file);
  if (file.endsWith(".tar.gz") && (await fs.stat(archive)).isFile()) {
    archives.push(archive);
  }
}
// Listing an archive decompresses all of it: up to about a second for the
// Windows ones, which contain several DLLs.
const listTimeout = 60_000;

test("Check if all the file exists", async () => {
  expect(files.length).toBeGreaterThan(0);
});

test("Ensure all files in the 'builds' directory have a positive size", async () => {
  for (const file of files) {
    const stat = await fs.stat(`builds/${file}`);
    expect(stat.size).toBeGreaterThan(0);
  }
});

test("Ensure the 'builds' directory contains archives", () => {
  expect(archives.length).toBeGreaterThan(0);
});

test.each(archives)(
  "Ensure %s contains the headers of the Ghostscript API",
  async (archive) => {
    const entries = [];
    await tar.t({
      file: archive,
      onReadEntry: (entry) => entries.push(entry.path.replace(/^\.\//, "")),
    });
    for (const header of ["iapi.h", "ierrors.h", "gserrors.h", "gdevdsp.h"]) {
      expect(entries, archive).toContain(`ghostpdl/include/${header}`);
    }
  },
  listTimeout
);
