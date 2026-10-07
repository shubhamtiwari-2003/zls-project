// Adds shadcn/ui components, then fixes a registry bug.
//
//   npm run ui:add -- button card dialog
//   npm run ui:add -- https://ui.shadcn.com/r/styles/base-nova/drawer.json
//
// As of Oct 2026 the shadcn registry serves components with
// `import { cn } from "cn"` instead of "@/lib/utils", and the CLI then
// installs an unrelated npm package called "cn". This rewrites the import
// to our helper and removes that package. Safe to keep once the registry
// is fixed: it then finds nothing to change.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const uiDir = join("src", "components", "ui");
const requested = process.argv.slice(2);

// Names ("drawer") or registry URLs (".../styles/base-nova/drawer.json").
if (requested.length === 0 || !requested.every((name) => /^[a-z0-9@/._:-]+$/i.test(name))) {
  console.error("Usage: npm run ui:add -- <component> [component…]");
  process.exit(1);
}

// Components we already have may have been edited: never overwrite them
// (the CLI would also stop and wait for an answer to "overwrite?").
const components = requested.filter((name) => {
  const file = `${name.split("/").pop().replace(/\.json$/, "")}.tsx`;
  const exists = existsSync(join(uiDir, file));
  if (exists) console.log(`Skipping "${name}": src/components/ui/${file} already exists.`);
  return !exists;
});

if (components.length === 0) process.exit(0);

// One command string (names checked above): npx/npm are .cmd files on
// Windows and need a shell.
const run = (command) => spawnSync(command, { stdio: "inherit", shell: true });

const added = run(`npx --yes shadcn@latest add ${components.join(" ")} --yes`);
if (added.status !== 0) process.exit(added.status ?? 1);

// 1. Point imports at our cn() helper.
let fixed = 0;

for (const file of readdirSync(uiDir)) {
  if (!/\.(tsx?|jsx?)$/.test(file)) continue;

  const path = join(uiDir, file);
  const source = readFileSync(path, "utf8");
  const updated = source.replace(/from\s+["']cn["']/g, 'from "@/lib/utils"');

  if (updated !== source) {
    writeFileSync(path, updated);
    fixed++;
  }
}

if (fixed) console.log(`Fixed the cn import in ${fixed} file(s).`);

// 2. Remove the stray "cn" package if the CLI installed it.
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

if (pkg.dependencies?.cn) {
  console.log('Removing the unrelated "cn" package…');
  run("npm uninstall cn");
}
