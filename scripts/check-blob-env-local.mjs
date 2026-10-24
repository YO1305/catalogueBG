import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("NO_ENV_LOCAL");
  process.exit(1);
}

const text = fs.readFileSync(envPath, "utf8");
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq);
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  process.env[key] = val.replace(/\\n/g, "\n");
}

const rw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const storeId = process.env.BLOB_STORE_ID ?? "";
const webhook = process.env.BLOB_WEBHOOK_PUBLIC_KEY ?? "";
const oidc = process.env.VERCEL_OIDC_TOKEN ?? "";
const provider = process.env.STORAGE_PROVIDER ?? "";

let oidcStatus = "missing";
if (oidc.length > 100) {
  try {
    const payload = JSON.parse(
      Buffer.from(oidc.split(".")[1], "base64url").toString("utf8"),
    );
    oidcStatus = Date.now() < payload.exp * 1000 ? "valid" : "expired";
  } catch {
    oidcStatus = "bad_format";
  }
}

console.log("FILE_OK");
console.log("STORAGE_PROVIDER", provider === "vercel-blob" ? "ok" : "wrong");
console.log("BLOB_STORE_ID", storeId.startsWith("store_") ? "ok" : "missing");
console.log(
  "BLOB_WEBHOOK_PUBLIC_KEY",
  webhook.includes("BEGIN PUBLIC KEY") ? "ok" : "missing",
);
console.log("BLOB_READ_WRITE_TOKEN", rw.length > 20 ? "present" : "not_needed");
console.log("VERCEL_OIDC_TOKEN", oidcStatus);

if (rw.length > 20 && rw.startsWith("store_")) {
  console.log("WARN_RW_LOOKS_LIKE_STORE_ID");
}

if (rw.length > 20) {
  console.log("BLOB_AUTH", "read_write_token");
} else if (storeId.startsWith("store_") && oidcStatus === "valid") {
  console.log("BLOB_AUTH", "OIDC_OK");
} else if (storeId.startsWith("store_") && oidcStatus === "expired") {
  console.log("BLOB_AUTH", "run_vercel_env_pull");
} else {
  console.log("BLOB_AUTH", "incomplete");
}
