"use client";

import { useI18n } from "@/components/i18n/I18n";
import { catalogCoverKicker } from "@/lib/catalogCoverKicker";
import { resolveCoverTypography } from "@/lib/catalogCoverTypography";
import { coverStyle } from "@/lib/catalogThemes";
import type { Catalog } from "@/types";

export function PageCover({ catalog, coverImage }: { catalog: Catalog; coverImage?: string }) {
  const { lang, t } = useI18n();
  const image = coverImage ?? catalog.cover.imageUrl;
  const typo = resolveCoverTypography(catalog.coverTypography);
  const darkCover = catalog.layout.theme === "dark" || catalog.layout.theme === "classic";
  const themeText = darkCover ? "#f4efe6" : "#1c1915";
  const themeAccent = darkCover ? "#e6d3a1" : "#163a66";
  const themeBg = coverStyle(catalog.layout.theme);
  const onPhotoText = typo.textOnImage === "light" ? "#f4efe6" : "#1c1915";
  const onPhotoAccent = typo.textOnImage === "light" ? "#e6d3a1" : "#8b6914";
  const kicker = catalogCoverKicker(catalog, lang, t("brand"));
  const title = catalog.title[lang] || t("catalogs.createTitle");
  const subtitle = catalog.subtitle[lang];

  if (image) {
    const dim = typo.imageDimPct / 100;
    return (
      <div className="relative h-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {dim > 0 ? <div className="absolute inset-0 bg-black" style={{ opacity: dim }} aria-hidden /> : null}
        <div className="absolute inset-x-[8%] whitespace-pre-wrap" style={{ top: `${typo.kickerTopPct}%`, color: onPhotoAccent, fontWeight: typo.kickerWeight }}>
          <span className="text-[0.78em] uppercase tracking-[0.28em]">{kicker}</span>
        </div>
        <div className="absolute inset-x-[8%] whitespace-pre-wrap" style={{ top: `${typo.titleTopPct}%`, color: onPhotoText }}>
          <p className="font-display text-[2.5em] leading-none" style={{ fontWeight: typo.titleWeight }}>
            {title}
          </p>
        </div>
        {subtitle ? (
          <div className="absolute inset-x-[8%]" style={{ top: `${typo.subtitleTopPct}%`, color: onPhotoText, fontWeight: typo.subtitleWeight }}>
            <p className="max-w-[16em] text-[0.95em] leading-snug opacity-95">{subtitle}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden" style={{ color: themeText }}>
      <div className="absolute inset-0" style={{ background: themeBg }} aria-hidden />
      <div className="relative flex h-full flex-col justify-between px-[8%] py-[8%]">
        <div
          className="text-[0.78em] uppercase tracking-[0.28em]"
          style={{ color: themeAccent, fontWeight: typo.kickerWeight, transform: `translateY(${typo.kickerTopPct - 10}%)` }}
        >
          {kicker}
        </div>
        <div style={{ transform: `translateY(${(typo.titleTopPct - 38) * 0.5}%)` }}>
          <p className="font-display text-[2.5em] leading-none" style={{ fontWeight: typo.titleWeight }}>
            {title}
          </p>
          {subtitle ? (
            <p className="mt-[0.6em] max-w-[16em] text-[0.95em] opacity-80" style={{ fontWeight: typo.subtitleWeight }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div aria-hidden />
      </div>
    </div>
  );
}
