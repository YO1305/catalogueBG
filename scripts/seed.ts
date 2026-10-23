import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Database } from "../src/types/index.ts";

const seed = JSON.parse(readFileSync(path.join(process.cwd(), "data/seed.json"), "utf8")) as Database;

async function main() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.log("Local catalogue is data/seed.json. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to upload.");
    return;
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
  const batchSize = 400;
  const writes: Array<[string, string, object]> = [];
  for (const item of seed.collections) writes.push(["collections", item.id, item]);
  for (const item of seed.fabricTypes) writes.push(["fabricTypes", item.id, item]);
  for (const item of seed.productTypes) writes.push(["productTypes", item.id, item]);
  for (const item of seed.templates) writes.push(["templates", item.id, item]);
  for (const item of seed.fabrics) writes.push(["fabrics", item.id, item]);
  for (const item of seed.catalogs) writes.push(["catalogs", item.slug, item]);
  for (const item of seed.leads) writes.push(["leads", item.id, item]);
  for (const item of seed.users) writes.push(["users", item.id, item]);
  writes.push(["settings", "glossary", { terms: seed.glossary }]);
  for (let offset = 0; offset < writes.length; offset += batchSize) {
    const batch = db.batch();
    for (const [collection, id, value] of writes.slice(offset, offset + batchSize)) {
      batch.set(db.collection(collection).doc(id), value);
    }
    await batch.commit();
  }
  console.log(`Uploaded ${writes.length} documents`);
}

void main();
