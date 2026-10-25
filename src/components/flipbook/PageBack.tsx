"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { contactAddress } from "@/lib/localize";
import type { Catalog } from "@/types";

export function PageBack({ catalog, onLead }: { catalog: Catalog; onLead: () => void }) {
  const { lang, t } = useI18n();
  return (
    <div className="flex h-full flex-col justify-between px-[8%] py-[8%]">
      <div>
        <p className="font-display text-[2em]">{t("catalog.contacts")}</p>
        <CopyRow label={t("catalog.phone")} value={catalog.contacts.phone} />
        <CopyRow label={t("catalog.telegram")} value={catalog.contacts.telegram} />
        <CopyRow label={t("catalog.email")} value={catalog.contacts.email} />
        <p className="mt-[1em] text-[0.9em]" style={{ color: "var(--muted)" }}>
          {contactAddress(catalog, lang)}
        </p>
      </div>
      <div className="flex justify-end">
        <button type="button" className="bg-[#163a66] px-[1em] py-[0.7em] text-[0.85em] text-[#f4efe6]" onClick={onLead}>
          {t("catalog.lead")}
        </button>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <div className="mt-[0.7em] flex items-center justify-between gap-3 border-b py-[0.4em]" style={{ borderColor: "var(--line)" }}>
      <div>
        <div className="text-[0.68em] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          {label}
        </div>
        <div className="text-[1em]">{value}</div>
      </div>
      <button
        type="button"
        className="text-[0.75em] underline"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setDone(true);
        }}
      >
        {done ? t("common.copied") : t("common.copy")}
      </button>
    </div>
  );
}
