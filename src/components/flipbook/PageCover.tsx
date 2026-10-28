"use client";

import { useI18n } from "@/components/i18n/I18n";
import { catalogCoverKicker } from "@/lib/catalogCoverKicker";
import { coverStyle } from "@/lib/catalogThemes";
import type { Catalog } from "@/types";

export function PageCover({ catalog, coverImage }: { catalog: Catalog; coverImage?: string }) {
  const { lang, t } = useI18n();
  const image = coverImage ?? catalog.cover.imageUrl;
  const darkCover = catalog.layout.theme === "dark" || catalog.layout.theme === "classic";
  const text = darkCover ? "#f4efe6" : "#1c1915";
  const accent = darkCover ? "#e6d3a1" : "#163a66";
  const themeBg = coverStyle(catalog.layout.theme);

  return (
    <div className="relative h-full overflow-hidden" style={{ color: text }}>
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" aria-hidden />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: themeBg }} aria-hidden />
      )}
      <div className="relative flex h-full flex-col justify-between px-[8%] py-[8%]">
        <div className="text-[0.78em] uppercase tracking-[0.28em]" style={{ color: image ? "#e6d3a1" : accent }}>
          {catalogCoverKicker(catalog, lang, t("brand"))}
        </div>
        <div>
          <p className="font-display text-[2.5em] leading-none drop-shadow-sm">{catalog.title[lang] || t("catalogs.createTitle")}</p>
          <p className="mt-[0.6em] max-w-[16em] text-[0.95em] opacity-90 drop-shadow-sm">{catalog.subtitle[lang]}</p>
        </div>
        <div aria-hidden />
      </div>
    </div>
  );
}
