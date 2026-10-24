import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Role } from "../src/types/index.ts";

function init() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
    process.exit(1);
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
}

async function main() {
  init();
  const email = process.argv[2];
  const role = process.argv[3] as Role | undefined;
  if (!email || !role || !["admin", "designer", "manager"].includes(role)) {
    console.error("Usage: npm run set-role -- email@example.com admin|designer|manager");
    process.exit(1);
  }
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { role });
  console.log(`OK: ${email} → role "${role}" (uid ${user.uid})`);
  console.log("Sign out everywhere, then sign in again on the site.");
}

void main();
