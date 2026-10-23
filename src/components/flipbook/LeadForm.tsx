"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Input, Textarea } from "@/components/ui/field";
import type { BookModel } from "@/components/flipbook/Book";
import type { Lang } from "@/types";

export function LeadForm({
  slug,
  lang,
  fabricIds,
  fabrics,
  onDone,
}: {
  slug: string;
  lang: Lang;
  fabricIds: string[];
  fabrics: BookModel["fabrics"];
  onDone: (text: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const arts = fabricIds.map((id) => fabrics.find((fabric) => fabric.id === id)?.art).filter(Boolean).join(", ");
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ catalogSlug: slug, name, contact, message, lang, fabricIds }),
        });
        if (response.status === 429) return setError(t("error.rate"));
        if (!response.ok) return setError(t("error.lead"));
        onDone(t("lead.success"));
      }}
    >
      <p className="text-sm text-ink/70">{t("lead.designs")}: {arts || "—"}</p>
      <Input aria-label={t("lead.name")} placeholder={t("lead.name")} value={name} onChange={(event) => setName(event.target.value)} required />
      <Input aria-label={t("lead.contact")} placeholder={t("lead.contact")} value={contact} onChange={(event) => setContact(event.target.value)} required />
      <Textarea aria-label={t("lead.message")} placeholder={t("lead.message")} value={message} onChange={(event) => setMessage(event.target.value)} />
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <button type="submit" className="h-10 bg-majolica px-4 text-sm text-paper">{t("lead.submit")}</button>
    </form>
  );
}
