import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { getStorage } from "firebase-admin/storage";
import { firebaseAdminConfigured, getAdminApp } from "@/lib/firebaseAdmin";

export type StorageProvider = "vercel-blob" | "firebase" | "local";

function storageBucketName() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : undefined)
  );
}

export function storageProvider(): StorageProvider {
  const configured = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (configured === "firebase") return "firebase";
  if (configured === "local") return "local";
  const wantsBlob = configured === "vercel-blob" || Boolean(process.env.BLOB_STORE_ID);
  if (wantsBlob) {
    const rw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
    if (process.env.NODE_ENV === "development" && rw.length <= 20) return "local";
    return "vercel-blob";
  }
  if (firebaseAdminConfigured() && storageBucketName()) return "firebase";
  return "local";
}

function blobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN.length > 20) return true;
  return Boolean(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN);
}

async function saveVercelBlob(relativePath: string, data: Buffer, contentType: string) {
  if (!blobConfigured()) throw new Error("storage_blob");
  const clean = relativePath.replace(/^\/+/, "");
  const result = await put(clean, data, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  return result.url;
}

async function saveFirebase(relativePath: string, data: Buffer, contentType: string) {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  const bucketId = storageBucketName();
  if (!bucketId) throw new Error("storage_bucket");
  const clean = relativePath.replace(/^\/+/, "");
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

function saveLocal(relativePath: string, data: Buffer) {
  const clean = relativePath.replace(/^\/+/, "");
  const full = path.join(process.cwd(), "public", clean);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, data);
  return `/${clean}`;
}

export async function saveBuffer(relativePath: string, data: Buffer, contentType: string) {
  const provider = storageProvider();
  if (provider === "vercel-blob") return saveVercelBlob(relativePath, data, contentType);
  if (provider === "firebase") return saveFirebase(relativePath, data, contentType);
  return saveLocal(relativePath, data);
}
