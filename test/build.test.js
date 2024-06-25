import { expect, test } from "vitest";
import fs from "node:fs/promises";

const files = await fs.readdir("builds");
test("Check if all the file exists", async () => {
  expect(files.length).toBeGreaterThan(0);
});

test("Ensure all files in the 'builds' directory have a positive size", async () => {
  for (const file of files) {
    const stat = await fs.stat(`builds/${file}`);
    expect(stat.size).toBeGreaterThan(0);
  }
});
