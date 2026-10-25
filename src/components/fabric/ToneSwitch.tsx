"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { ColorOption } from "@/lib/variants";

/** Segmented slider light / medium / dark for dyed fabrics. */
export function ToneSwitch({ options, value, onChange }: { options: ColorOption[]; value?: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  const index = Math.max(0, options.findIndex((item) => item.id === value));
  return (
    <div className="relative grid rounded-2xl bg-ink/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={t("tone.label")}>
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
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs leading-tight transition-colors ${active ? "text-ink" : "text-ink/55 hover:text-ink"}`}
            onClick={() => onChange(option.id)}
          >
            <span className="h-4 w-4 shrink-0 rounded-full border border-ink/15 bg-cover bg-center" style={{ backgroundImage: `url("${option.design.thumbUrl || option.design.webUrl}")` }} />
            <span className="text-left">{t(`tone.${option.tone ?? "medium"}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
