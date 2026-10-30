import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const check = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== check.length) return false;
  return timingSafeEqual(expected, check);
}

export function hashPin(pin: string) {
  return hashPassword(pin);
}

function legacyPinHash(pin: string) {
  return createHash("sha256").update(`bahmal-pin:${pin}`).digest("hex");
}

export function verifyPin(pin: string, stored: string) {
  if (stored.startsWith("scrypt:")) return verifyPassword(pin, stored);
  const check = Buffer.from(legacyPinHash(pin));
  const expected = Buffer.from(stored);
  if (check.length !== expected.length) return false;
  return timingSafeEqual(check, expected);
}
