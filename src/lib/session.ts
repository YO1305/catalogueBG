import type { AdminSection, Role } from "@/types";

export const SESSION_COOKIE = "bahmal_session";

export function cookieHeader(name: string, value: string, maxAge = 60 * 60 * 24 * 7) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export type Session = {
  uid: string;
  email: string;
  name: string;
  role: Role;
  sections?: AdminSection[];
  exp: number;
  kind?: "user" | "pin";
};

function secret() {
  const value = process.env.SESSION_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return "dev-only-bahmal-session-change-me";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey() {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(session: Omit<Session, "exp">, maxAgeSec = 60 * 60 * 24 * 7) {
  const payload: Session = { kind: "user", ...session, exp: Math.floor(Date.now() / 1000) + maxAgeSec };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function readToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), base64UrlToBytes(signature), new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as Session;
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    if (!session.role || !session.email) return null;
    return session;
  } catch {
    return null;
  }
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  const session = await readToken(token);
  if (!session || session.kind === "pin") return null;
  return session;
}
