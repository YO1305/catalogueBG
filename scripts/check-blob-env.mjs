const rw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const storeId = process.env.BLOB_STORE_ID ?? "";
const oidc = process.env.VERCEL_OIDC_TOKEN ?? "";

if (rw.length > 20) {
  console.log("TOKEN_OK");
} else if (storeId.length > 5 && oidc.length > 100) {
  console.log("OIDC_OK");
} else if (storeId.length > 5) {
  console.log("STORE_OK_NEED_OIDC_OR_RW");
} else {
  console.log("TOKEN_EMPTY");
}
