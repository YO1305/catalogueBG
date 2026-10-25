"use client";

import { LANGS } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Lang } from "@/types";

/** RU / EN / UZ switch for editing the text of one language at a time; a dot marks languages still empty. */
export function LangTabs({ value, onChange, filled, label }: { value: Lang; onChange: (lang: Lang) => void; filled?: (lang: Lang) => boolean; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-10 items-center gap-1 rounded-lg bg-ink/5 p-1">
      {LANGS.map((lang) => {
        const active = lang === value;
        const empty = filled ? !filled(lang) : false;
        return (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "relative flex h-8 min-w-12 items-center justify-center rounded-md px-3 text-sm font-medium uppercase leading-none transition",
              active ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink",
            )}
            onClick={() => onChange(lang)}
          >
            {lang}
            {empty ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
          </button>
        );
      })}
    </div>
  );
}
