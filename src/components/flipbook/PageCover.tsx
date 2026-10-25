"use client";

import { useI18n } from "@/components/i18n/I18n";
import { coverStyle } from "@/lib/catalogThemes";
import type { Catalog } from "@/types";

export function PageCover({ catalog }: { catalog: Catalog }) {
  const { lang, t } = useI18n();
  const darkCover = catalog.layout.theme === "dark" || catalog.layout.theme === "classic";
  const text = darkCover ? "#f4efe6" : "#1c1915";
  const accent = darkCover ? "#e6d3a1" : "#163a66";
  return (
    <div className="flex h-full flex-col justify-between px-[8%] py-[8%]" style={{ background: coverStyle(catalog.layout.theme), color: text }}>
      <div className="text-[0.78em] uppercase tracking-[0.28em]" style={{ color: accent }}>{t("brand")}</div>
      <div>
        <p className="font-display text-[2.5em] leading-none">{catalog.title[lang] || t("catalogs.createTitle")}</p>
        <p className="mt-[0.6em] max-w-[16em] text-[0.95em] opacity-80">{catalog.subtitle[lang]}</p>
      </div>
      <div aria-hidden />
    </div>
  );
}
