"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { Catalog } from "@/types";

export function PageCover({ catalog, image, count }: { catalog: Catalog; image?: string; count: number }) {
  const { lang, t } = useI18n();
  return (
    <div className="flex h-full flex-col justify-between px-[8%] py-[8%]" style={{ background: "linear-gradient(165deg, #163a66 0%, #0e2746 58%, #1c1915 100%)", color: "#f4efe6" }}>
      <div className="text-[0.78em] uppercase tracking-[0.28em] text-[#e6d3a1]">{t("brand")}</div>
      <div>
        <p className="font-display text-[2.5em] leading-none">{catalog.title[lang]}</p>
        <p className="mt-[0.6em] max-w-[16em] text-[0.95em] text-[#f4efe6]/80">{catalog.subtitle[lang]}</p>
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={catalog.title[lang]} className="mt-[1em] h-[42%] w-full object-cover" />
      ) : null}
      <div className="flex items-end justify-between text-[0.78em] uppercase tracking-[0.16em] text-[#e6d3a1]">
        <span>{t("home.designs", { count })}</span>
        <span>2026</span>
      </div>
    </div>
  );
}
