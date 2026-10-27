"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { BASE_VARIANT, type ColorOption } from "@/lib/variants";

function optionLabel(option: ColorOption, t: (key: string) => string): string {
  if (option.name.trim()) return option.name.trim();
  if (option.id === BASE_VARIANT) return t("designs.baseColorName");
  return t("designs.variantName").replace("{n}", "");
}

function swatchStyle(option: ColorOption): CSSProperties {
  const url = option.design.thumbUrl || option.design.webUrl;
  if (url) return { backgroundImage: `url("${url}")` };
  if (option.weaveColor) return { backgroundColor: option.weaveColor };
  return { backgroundColor: "rgba(0,0,0,0.08)" };
}

/** Переключатель цветовых вариантов жаккарда / страйп-сатина (как тоны, но с вашими названиями). */
export function WovenVariantSwitch({ options, value, onChange }: { options: ColorOption[]; value?: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  const index = Math.max(0, options.findIndex((item) => item.id === value));
  return (
    <div
      className="relative grid rounded-2xl bg-ink/[0.06] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={t("designs.variants")}
    >
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => {
        const active = option.id === options[index]?.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`relative z-10 flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-tight transition-colors ${active ? "text-ink" : "text-ink/55 hover:text-ink"}`}
            onClick={() => onChange(option.id)}
          >
            <span className="h-8 w-8 shrink-0 rounded-full border border-ink/15 bg-cover bg-center" style={swatchStyle(option)} />
            <span className="line-clamp-2 text-center">{optionLabel(option, t)}</span>
          </button>
        );
      })}
    </div>
  );
}
