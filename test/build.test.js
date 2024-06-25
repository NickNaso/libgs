import { expect, test } from "vitest";
import fs from "node:fs/promises";

const files = await fs.readdir("builds");
test("Check if all the file exists", async () => {
  expect(files.length).toBeGreaterThan(0);
});

test("Check if all files weight greater than 0", async () => {
  for (const file of files) {
    const stat = await fs.stat(`builds/${file}`);
    expect(stat.size).toBeGreaterThan(0);
  }
});
