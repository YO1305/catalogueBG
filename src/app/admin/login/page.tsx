"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { firebaseClientConfigured, getFirebaseApp } from "@/lib/firebase";

function useFirebaseLogin() {
  return firebaseClientConfigured() && process.env.NEXT_PUBLIC_DEMO_AUTH === "0";
}

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/admin/catalogs";
  const firebaseLogin = useFirebaseLogin();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(false);
    setBusy(true);
    try {
      if (firebaseLogin) {
        const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
        const app = getFirebaseApp();
        if (!app) {
          setError(true);
          return;
        }
        const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
        const idToken = await cred.user.getIdToken(true);
        const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
        if (!response.ok) {
          setError(true);
          return;
        }
      } else {
        const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
        if (!response.ok) {
          setError(true);
          return;
        }
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="font-display text-3xl text-majolica">{t("brand")}</p>
      <h1 className="mt-2 text-lg">{t("auth.title")}</h1>
      <form className="mt-6 space-y-3" onSubmit={submit}>
        <Label>{t("auth.email")}</Label>
        <Input type="email" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
        <Label>{t("auth.password")}</Label>
        <Input type="password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        {error ? <p className="text-sm text-red-800">{t("auth.error")}</p> : null}
        {busy ? <p className="text-sm text-ink/60">{t("auth.signingIn")}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("auth.signingIn") : t("auth.submit")}
        </Button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
