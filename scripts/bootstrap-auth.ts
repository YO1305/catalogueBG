import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Role } from "../src/types/index.ts";

const STAFF: Array<{ email: string; password: string; role: Role; name: string }> = [
  { email: "admin@bahmal.uz", password: "bahmal-admin", role: "admin", name: "Administrator" },
  { email: "designer@bahmal.uz", password: "bahmal-design", role: "designer", name: "Designer" },
  { email: "manager@bahmal.uz", password: "bahmal-manager", role: "manager", name: "Manager" },
];

async function main() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  const auth = getAuth();
  for (const user of STAFF) {
    try {
      const record = await auth.getUserByEmail(user.email);
      await auth.updateUser(record.uid, { password: user.password, displayName: user.name });
      await auth.setCustomUserClaims(record.uid, { role: user.role });
      console.log(`Updated ${user.email} (${user.role})`);
    } catch (error: unknown) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "";
      if (code !== "auth/user-not-found") throw error;
      const created = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
      });
      await auth.setCustomUserClaims(created.uid, { role: user.role });
      console.log(`Created ${user.email} (${user.role})`);
    }
  }
  console.log("Done. Sign in at /admin/login with these emails and passwords.");
}

void main();
