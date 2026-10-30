import "server-only";
import { readBuffer, saveBuffer } from "@/lib/storage";

export async function readJsonBlob<T>(relativePath: string): Promise<T | null> {
  const buffer = await readBuffer(relativePath);
  if (!buffer) return null;
  try {
    return JSON.parse(buffer.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeJsonBlob(relativePath: string, value: unknown): Promise<void> {
  await saveBuffer(relativePath, Buffer.from(JSON.stringify(value), "utf8"), "application/json");
}
