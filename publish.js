"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { parseArgs } = require("node:util");

const packagesDir = path.join(__dirname, "npm", "@libgs");

/**
 * Runs npm with the given arguments. The npm CLI is run with node when the
 * script is started by npm (npm_execpath). Otherwise npm is run by name,
 * which on Windows is a .cmd file that needs a shell: the arguments are
 * joined into the command, so they must not contain characters of the shell
 * (they are fixed, apart from the dist-tag, which is validated).
 *
 * @param {string[]} args - The arguments of npm.
 * @param {Object} options - The options of the child process.
 * @param {string} [options.cwd] - The working directory.
 * @param {boolean} [options.interactive] - Whether npm uses this terminal,
 * e.g. to ask for the authentication; otherwise its output is returned.
 * @return {Promise<{code: number, stdout: string, stderr: string}>} A promise
 * that resolves with the exit code and, when not interactive, the output.
 */
function runNpm(args, { cwd, interactive = false } = {}) {
  const npmCli = process.env.npm_execpath;
  const stdio = interactive ? "inherit" : ["ignore", "pipe", "pipe"];
  return new Promise((resolve, reject) => {
    const child =
      npmCli && npmCli.endsWith(".js")
        ? spawn(process.execPath, [npmCli, ...args], { cwd, stdio })
        : process.platform === "win32"
          ? spawn(`npm ${args.join(" ")}`, { cwd, stdio, shell: true })
          : spawn("npm", args, { cwd, stdio });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => (stdout += data));
    child.stderr?.on("data", (data) => (stderr += data));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/**
 * Reads the packages created by make.js in npm/@libgs and checks
 * that each one has its files.
 *
 * @return {Promise<{name: string, version: string, dir: string}[]>} A promise
 * that resolves with the packages, sorted by name.
 * @throws {Error} If there is no package or a package is incomplete.
 */
async function readPackages() {
  const names = await fs.readdir(packagesDir).catch(() => []);
  if (names.length === 0) {
    throw new Error(`No package in ${packagesDir}: run npm run make`);
  }
  const packages = [];
  for (const name of names.sort()) {
    const dir = path.join(packagesDir, name);
    for (const file of ["package.json", "index.js", "lib", "include"]) {
      await fs.access(path.join(dir, file)).catch(() => {
        throw new Error(`${dir} has no ${file}: run npm run make`);
      });
    }
    const packageJson = JSON.parse(
      await fs.readFile(path.join(dir, "package.json"), "utf8")
    );
    packages.push({ name: packageJson.name, version: packageJson.version, dir });
  }
  return packages;
}

/**
 * Checks whether a version of a package is already on the registry.
 *
 * @param {string} name - The name of the package.
 * @param {string} version - The version of the package.
 * @return {Promise<boolean>} A promise that resolves with true if the version
 * is published, false if the package or the version does not exist.
 * @throws {Error} If the registry cannot be queried.
 */
async function isPublished(name, version) {
  const { code, stdout, stderr } = await runNpm([
    "view",
    `${name}@${version}`,
    "version",
  ]);
  if (code === 0) return stdout.trim() === version;
  if (/E404/.test(stderr)) return false;
  throw new Error(`Cannot query ${name}@${version}:\n${stderr}`);
}

/**
 * Ensures that npm has a logged-in user, running npm login otherwise.
 *
 * @return {Promise<void>} A promise that resolves when a user is logged in.
 * @throws {Error} If the login fails.
 */
async function ensureLogin() {
  const { code, stdout } = await runNpm(["whoami"]);
  if (code === 0) {
    process.stdout.write(`Logged in to npm as ${stdout.trim()}\n`);
    return;
  }
  process.stdout.write("Not logged in to npm: running npm login\n");
  const login = await runNpm(["login"], { interactive: true });
  if (login.code !== 0) throw new Error("npm login failed");
}

/**
 * Publishes the packages in npm/@libgs one at a time. Each npm publish uses
 * this terminal, so npm asks for the authentication of every package (the
 * one-time password or the confirmation in the browser of the two-factor
 * authentication). The versions already on the registry are skipped, so the
 * script can be run again after a failure.
 *
 * @return {Promise<void>} A promise that resolves when the packages are published.
 * @throws {Error} If a package cannot be published.
 */
async function publishPackages() {
  const { values } = parseArgs({
    options: {
      // Runs npm publish --dry-run: nothing is published.
      "dry-run": { type: "boolean", default: false },
      // The dist-tag of the published versions, latest when omitted.
      tag: { type: "string" },
    },
    strict: true,
  });
  const dryRun = values["dry-run"];
  if (values.tag !== undefined && !/^[A-Za-z][A-Za-z0-9._-]*$/.test(values.tag)) {
    throw new Error(`Invalid dist-tag: ${values.tag}`);
  }

  const packages = await readPackages();
  process.stdout.write(
    `${packages.length} packages in ${packagesDir}${dryRun ? " (dry run)" : ""}\n`
  );
  if (!dryRun) await ensureLogin();

  const published = [];
  const skipped = [];
  for (const [index, { name, version, dir }] of packages.entries()) {
    const id = `${name}@${version}`;
    process.stdout.write(`\n[${index + 1}/${packages.length}] ${id}\n`);
    if (await isPublished(name, version)) {
      process.stdout.write(`${id} is already published: skipped\n`);
      skipped.push(id);
      continue;
    }
    // Scoped packages are private unless published with public access.
    const args = ["publish", "--access", "public"];
    if (values.tag) args.push("--tag", values.tag);
    if (dryRun) args.push("--dry-run");
    let { code } = await runNpm(args, { cwd: dir, interactive: true });
    if (code !== 0 && !dryRun && (await runNpm(["whoami"])).code !== 0) {
      // The session has expired: log in again and retry once.
      await ensureLogin();
      ({ code } = await runNpm(args, { cwd: dir, interactive: true }));
    }
    if (code !== 0) {
      throw new Error(
        `npm publish of ${id} failed. Published: ${published.length}, ` +
          `skipped: ${skipped.length}, remaining: ${packages.length - index}. ` +
          "Run the script again to resume: the published versions are skipped."
      );
    }
    published.push(id);
  }

  process.stdout.write(
    `\n${dryRun ? "Checked" : "Published"} ${published.length} packages, ` +
      `skipped ${skipped.length} already published\n`
  );
}

publishPackages().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
