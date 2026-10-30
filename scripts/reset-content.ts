import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Database } from "../src/types/index.ts";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val.replace(/\\n/g, "\n");
  }
}

loadEnvLocal();

const seed = JSON.parse(readFileSync(path.join(process.cwd(), "data", "seed.json"), "utf8")) as Database;

// `events` is cleared separately by `npm run cleanup:events` in daily portions.
const WIPE = ["fabrics", "catalogs", "collections", "fabricTypes", "templates", "leads"] as const;
const WIPE_CAP = 2_000;

async function wipeCollection(db: Firestore, name: string) {
  const snap = await db.collection(name).select().limit(WIPE_CAP).get();
  if (snap.empty) {
    console.log(`  ${name}: 0`);
    return 0;
  }
  let batch = db.batch();
  let inBatch = 0;
  let total = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    inBatch += 1;
    total += 1;
    if (inBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();
  console.log(`  ${name}: ${total}`);
  return total;
}

async function writeBatch(db: Firestore, rows: Array<[string, string, object]>) {
  for (let offset = 0; offset < rows.length; offset += 400) {
    const batch = db.batch();
    for (const [collection, id, value] of rows.slice(offset, offset + 400)) {
      batch.set(db.collection(collection).doc(id), value);
    }
    await batch.commit();
  }
}

function initFirebase() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (e.g. vercel env pull .env.local).");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

async function restoreReference(db: Firestore) {
  const writes: Array<[string, string, object]> = [];
  for (const item of seed.collections) writes.push(["collections", item.id, item]);
  for (const item of seed.fabricTypes) writes.push(["fabricTypes", item.id, item]);
  for (const item of seed.productTypes) writes.push(["productTypes", item.id, item]);
  writes.push(["settings", "glossary", { terms: seed.glossary }]);
  await writeBatch(db, writes);
  console.log(`Restored reference: ${seed.collections.length} collections, ${seed.fabricTypes.length} fabric types, ${seed.productTypes.length} product types, glossary`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = initFirebase();
  console.log(dryRun ? "Dry run — nothing will change" : "Resetting catalogue content in Firestore…");
  if (dryRun) {
    for (const name of WIPE) {
      const count = await db.collection(name).count().get();
      console.log(`  ${name}: ${count.data().count} (would delete)`);
    }
    return;
  }
  console.log("Deleting:");
  for (const name of WIPE) await wipeCollection(db, name);
  console.log("Restoring base dictionaries from data/seed.json (no fabrics, no catalogs):");
  await restoreReference(db);
  console.log("Done. Users and auth are unchanged. Create catalogs and fabrics from admin.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
