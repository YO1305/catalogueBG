"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function PinGate({ slug, title }: { slug: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("brand")}</p>
      <h1 className="font-display mt-3 text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink/70">{t("catalog.pinTitle")}</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await fetch("/api/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, pin }) });
          if (!response.ok) return setError(true);
          router.refresh();
        }}
      >
        <Input inputMode="numeric" maxLength={4} aria-label={t("catalog.pinHint")} placeholder={t("catalog.pinHint")} value={pin} onChange={(event) => setPin(event.target.value)} />
        {error ? <p className="text-sm text-red-800">{t("catalog.pinError")}</p> : null}
        <Button type="submit">{t("catalog.pinSubmit")}</Button>
      </form>
    </main>
  );
}
