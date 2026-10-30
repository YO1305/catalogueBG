import assert from "node:assert/strict";
import test from "node:test";
import { decodeMediaToken, encodeMediaToken, publicMediaSrc, publicMediaSrcSet } from "./publicMedia";

const fabricUrl =
  "https://mo1waexxz33vfdmx.public.blob.vercel-storage.com/mockups/d75931e5-44ed-410f-a077-460d1fa6bfac-9217e54d-d41f-4529-a54a-2f48267bab8a-fabric-mvp5kv2m-1200.webp";

test("catalog photos use the blob URL directly", () => {
  const src = publicMediaSrc(fabricUrl);
  assert.equal(src, fabricUrl);
  assert.equal(src.includes("/_next/image"), false);
  assert.equal(src.includes("/api/p"), false);
});

test("srcset lists 600 and 1200 WebP", () => {
  const src600 = fabricUrl.replace("-1200.webp", "-600.webp");
  const srcSet = publicMediaSrcSet(src600, fabricUrl);
  assert.equal(srcSet, `${src600} 600w, ${fabricUrl} 1200w`);
});

test("encode/decode round-trips blob URLs for legacy /api/p tokens", () => {
  const token = encodeMediaToken(fabricUrl);
  assert.equal(decodeMediaToken(token), fabricUrl);
});

test("legacy hex tokens still decode", () => {
  const bytes = new TextEncoder().encode(fabricUrl);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  assert.equal(decodeMediaToken(hex), fabricUrl);
});
