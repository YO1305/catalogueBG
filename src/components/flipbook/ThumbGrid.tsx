"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { BuiltPage } from "@/types";

export function ThumbGrid({ pages, current, onPick }: { pages: BuiltPage[]; current: number; onPick: (index: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="absolute inset-0 z-40 overflow-auto bg-[#1c1915]/80 p-6" role="dialog" aria-label={t("catalog.thumbs")}>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {pages.map((page) => (
          <button key={page.index} type="button" className={`bg-paper p-3 text-left text-xs ${page.index === current ? "ring-2 ring-gold" : ""}`} onClick={() => onPick(page.index)}>
            <span className="font-mono">{page.index + 1}</span>
            <span className="mt-2 block uppercase tracking-wide">{page.kind}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
