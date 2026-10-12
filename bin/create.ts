#!/usr/bin/env bun
/**
 * create-bun-elysia — scaffolds a Bun monorepo:
 *   apps/api  Elysia + Drizzle ORM + SQLite (bun:sqlite)
 *   apps/web  React + Vite, typed API client via Eden Treaty
 *
 * Usage: create-bun-elysia <project-name> [--no-install] [--no-git]
 */
import { cp, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const TEMPLATE_DIR = join(import.meta.dir, "..", "template");
const PLACEHOLDER = "__APP_NAME__";

// Dependencies are installed at scaffold time so every new project gets the latest releases.
const DEPS: { cwd: string; deps: string[]; dev: string[] }[] = [
  { cwd: ".", deps: [], dev: ["typescript", "@types/bun"] },
  { cwd: "apps/api", deps: ["elysia", "drizzle-orm"], dev: ["drizzle-kit"] },
  {
    cwd: "apps/web",
    deps: ["react", "react-dom", "@elysiajs/eden"],
    dev: ["vite", "@vitejs/plugin-react", "@types/react", "@types/react-dom"],
  },
];

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function fail(msg: string): never {
  console.error(c.red(`✖ ${msg}`));
  process.exit(1);
}

async function run(cmd: string[], cwd: string) {
  console.log(c.dim(`  $ ${cmd.join(" ")}  (${cwd})`));
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if ((await proc.exited) !== 0) fail(`Command failed: ${cmd.join(" ")}`);
}

function isNewer(latest: string, current: string) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

async function checkBunVersion() {
  try {
    const res = await fetch("https://registry.npmjs.org/bun/latest", {
      signal: AbortSignal.timeout(3000),
    });
    const { version } = (await res.json()) as { version: string };
    if (isNewer(version, Bun.version)) {
      console.log(
        c.yellow(`⚠ Bun ${version} is available (you have ${Bun.version}). Run ${c.bold("bun upgrade")} to get it.\n`),
      );
    }
  } catch {
    // Offline or registry unreachable — not worth blocking the scaffold.
  }
}

async function replaceInTree(dir: string, appName: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await replaceInTree(path, appName);
    } else {
      const text = await readFile(path, "utf8");
      if (text.includes(PLACEHOLDER)) await writeFile(path, text.replaceAll(PLACEHOLDER, appName));
    }
  }
}

// --- main ---------------------------------------------------------------

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
let name = args.find((a) => !a.startsWith("--"));

if (flags.has("--help") || flags.has("-h")) {
  console.log("Usage: create-bun-elysia <project-name> [--no-install] [--no-git]");
  process.exit(0);
}

if (!name) name = prompt("Project name:", "my-app") ?? "my-app";

const target = resolve(process.cwd(), name);
const appName = basename(target).toLowerCase();
if (!/^[a-z0-9][a-z0-9._-]*$/.test(appName)) {
  fail(`"${appName}" is not a valid package name (use lowercase letters, digits, - . _)`);
}
if (existsSync(target) && (await readdir(target)).length > 0) {
  fail(`Directory ${target} already exists and is not empty`);
}

await checkBunVersion();

console.log(`${c.cyan("◆")} Creating ${c.bold(appName)} in ${target}\n`);
await cp(TEMPLATE_DIR, target, { recursive: true });
// npm strips .gitignore files from published packages, so the template ships it as "gitignore".
await rename(join(target, "gitignore"), join(target, ".gitignore"));
await replaceInTree(target, appName);

// Pin the Bun version used to create the project.
const rootPkgPath = join(target, "package.json");
const rootPkg = JSON.parse(await readFile(rootPkgPath, "utf8"));
rootPkg.packageManager = `bun@${Bun.version}`;
await writeFile(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");

const bun = process.execPath;

if (!flags.has("--no-install")) {
  console.log(`${c.cyan("◆")} Installing latest dependencies\n`);
  for (const { cwd, deps, dev } of DEPS) {
    const dir = join(target, cwd);
    if (deps.length) await run([bun, "add", ...deps], dir);
    if (dev.length) await run([bun, "add", "-d", ...dev], dir);
  }

  console.log(`\n${c.cyan("◆")} Generating initial database migration\n`);
  await run([bun, "run", "db:generate"], join(target, "apps/api"));
}

if (!flags.has("--no-git") && Bun.which("git")) {
  console.log(`\n${c.cyan("◆")} Initializing git repository\n`);
  await run(["git", "init", "-q"], target);
  await run(["git", "add", "-A"], target);
  const commit = Bun.spawn(["git", "commit", "-q", "-m", "Initial commit from create-bun-elysia"], {
    cwd: target,
    stdout: "ignore",
    stderr: "ignore",
  });
  if ((await commit.exited) !== 0) {
    console.log(c.yellow("  Skipped initial commit (configure git user.name/user.email to enable it)."));
  }
}

console.log(`
${c.green("✔ Done!")} Next steps:

  cd ${name}${flags.has("--no-install") ? "\n  bun install\n  bun run db:generate" : ""}
  bun dev

  Web: ${c.cyan("http://localhost:5173")}
  API: ${c.cyan("http://localhost:3000/api/health")}
`);
