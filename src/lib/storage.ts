import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getStorage } from "firebase-admin/storage";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";

function storageBucketName() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : undefined)
  );
}

export async function saveBuffer(relativePath: string, data: Buffer, contentType: string) {
  const clean = relativePath.replace(/^\/+/, "");
  if (firebaseAdminConfigured()) {
    const app = getAdminApp();
    if (!app) throw new Error("Firebase Admin is not configured");
    const bucketId = storageBucketName();
    if (!bucketId) throw new Error("storage_bucket");
    const bucket = getStorage(app).bucket(bucketId);
    const file = bucket.file(clean);
    await file.save(data, { contentType, resumable: false, metadata: { cacheControl: "public,max-age=31536000" } });
    try {
      await file.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${clean}`;
    } catch {
      const [url] = await file.getSignedUrl({ action: "read", expires: "2036-01-01" });
      return url;
    }
  }
  const full = path.join(process.cwd(), "public", clean);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, data);
  return `/${clean}`;
}
