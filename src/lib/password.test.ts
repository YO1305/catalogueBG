import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { hashPassword, hashPin, verifyPassword, verifyPin } from "./password";

test("password hash is salted scrypt and verifies", () => {
  const stored = hashPassword("secret-pass");
  assert.match(stored, /^scrypt:[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(verifyPassword("secret-pass", stored), true);
  assert.equal(verifyPassword("other", stored), false);
  assert.notEqual(hashPassword("secret-pass"), stored);
});

test("pin uses scrypt and still accepts old sha256 hashes", () => {
  const stored = hashPin("2580");
  assert.equal(stored.startsWith("scrypt:"), true);
  assert.equal(verifyPin("2580", stored), true);
  assert.equal(verifyPin("0000", stored), false);
  const legacy = createHash("sha256").update("bahmal-pin:2580").digest("hex");
  assert.equal(verifyPin("2580", legacy), true);
  assert.equal(verifyPin("1111", legacy), false);
});
