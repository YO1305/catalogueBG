import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

async function main() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase env");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  const bucket = getStorage().bucket();
  const file = bucket.file("uploads/_probe.txt");
  await file.save(Buffer.from("ok"), { contentType: "text/plain", resumable: false });
  console.log("bucket:", bucket.name, "saved uploads/_probe.txt");
}

void main().catch((error: unknown) => {
  console.error("failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
