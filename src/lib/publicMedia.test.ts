import assert from "node:assert/strict";
import test from "node:test";
import { decodeMediaToken, encodeMediaToken, publicMediaSrc } from "./publicMedia";

const fabricUrl =
  "https://mo1waexxz33vfdmx.public.blob.vercel-storage.com/mockups/d75931e5-44ed-410f-a077-460d1fa6bfac-9217e54d-d41f-4529-a54a-2f48267bab8a-fabric-mvp5kv2m-1200.webp";

test("obfuscated token does not contain fabric or https", () => {
  const src = publicMediaSrc(fabricUrl);
  assert.match(src, /^\/api\/p\?t=[0-9a-f]+$/);
  const token = src.slice("/api/p?t=".length);
  assert.equal(token.includes("666162726963"), false);
  assert.equal(token.includes("68747470"), false);
  assert.equal(/fabric/i.test(src), false);
});

test("encode/decode round-trips blob URLs", () => {
  const token = encodeMediaToken(fabricUrl);
  assert.equal(decodeMediaToken(token), fabricUrl);
});

test("legacy hex tokens still decode", () => {
  const bytes = new TextEncoder().encode(fabricUrl);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  assert.equal(decodeMediaToken(hex), fabricUrl);
});
