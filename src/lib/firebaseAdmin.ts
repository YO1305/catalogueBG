import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

export function firebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

function normalizePrivateKey(raw: string) {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

export function getAdminApp(): App | null {
  if (!firebaseAdminConfigured()) return null;
  if (getApps().length) return getApps()[0] ?? null;
  try {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error("Firebase Admin init failed", error);
    return null;
  }
}
