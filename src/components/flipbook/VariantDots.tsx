"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { ColorOption } from "@/lib/variants";

export function VariantDots({ options, value, onChange, size = "1.6em" }: { options: ColorOption[]; value?: string; onChange: (id: string) => void; size?: string }) {
  const { t } = useI18n();
  const selected = options.find((item) => item.id === value) ?? options[0];
  const label = (option: ColorOption) => (option.tone ? t(`tone.${option.tone}`) : option.name);
  return (
    <div className="flex flex-col gap-[0.3em]">
      <div className="flex flex-wrap gap-[0.4em]" role="radiogroup">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selected?.id}
            aria-label={label(option) || option.id}
            title={label(option)}
            className="rounded-full p-[0.12em] transition-shadow"
            style={{ boxShadow: option.id === selected?.id ? "0 0 0 1.5px var(--ink, #1c1915)" : "0 0 0 1px var(--line)" }}
            onClick={(event) => {
              event.stopPropagation();
              onChange(option.id);
            }}
          >
            <span
              className="block rounded-full bg-cover bg-center"
              style={{ width: size, height: size, backgroundImage: `url("${option.design.thumbUrl || option.design.webUrl}")` }}
            />
          </button>
        ))}
      </div>
      {selected && label(selected) ? <span className="text-[0.66em] leading-none" style={{ color: "var(--muted)" }}>{label(selected)}</span> : null}
    </div>
  );
}
