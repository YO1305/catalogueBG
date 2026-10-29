import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const srcRoot = path.join(process.cwd(), "src");
const allowPrefixes = [
  path.join(srcRoot, "lib", "db.ts"),
  path.join(srcRoot, "lib", "firestore"),
];

const banned = "firebase-admin/firestore";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function allowed(file) {
  const normalized = path.normalize(file);
  if (normalized === path.normalize(allowPrefixes[0])) return true;
  return normalized.startsWith(path.normalize(allowPrefixes[1]) + path.sep);
}

let failed = false;
for (const file of walk(srcRoot)) {
  if (allowed(file)) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes(banned)) {
    console.error(`Forbidden import "${banned}" in ${path.relative(process.cwd(), file)}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Firestore import check OK");
