import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const BATCH = 400;
const DEFAULT_MAX = 15_000;

function maxDeletes() {
  const flag = process.argv.find((arg) => arg.startsWith("--max="));
  const value = flag ? Number(flag.slice("--max=".length)) : DEFAULT_MAX;
  if (!Number.isFinite(value) || value <= 0) throw new Error("--max must be a positive number");
  return Math.floor(value);
}

async function main() {
  if (!process.argv.includes("--confirm-prod")) {
    console.error("Refusing to delete events. Pass --confirm-prod after the quota reset.");
    console.error("Each run deletes at most --max=15000 (default). Spark limit is 20000 deletes/day.");
    process.exit(1);
  }
  const max = maxDeletes();
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
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
  const db = getFirestore();
  let total = 0;
  while (total < max) {
    const take = Math.min(BATCH, max - total);
    const snap = await db.collection("events").select().limit(take).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    total += snap.size;
    console.log(`deleted ${total}/${max}`);
  }
  const left = await db.collection("events").count().get();
  console.log(`done: deleted ${total} this run, ${left.data().count} events left`);
}

void main();
