"use client";

import { CATALOG_THEMES } from "@/lib/catalogThemes";
import { useI18n } from "@/components/i18n/I18n";
import type { Catalog } from "@/types";

export function CatalogThemePicker({ theme, title, subtitle, onPick }: { theme: Catalog["layout"]["theme"]; title: string; subtitle: string; onPick: (theme: Catalog["layout"]["theme"]) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink/50">{t("catalogs.styleHint")}</p>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {CATALOG_THEMES.map((item) => {
          const active = theme === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full overflow-hidden rounded-sm border text-left ${active ? "ring-2 ring-majolica" : "border-black/10"}`}
                onClick={() => onPick(item.id)}
              >
                <div className="aspect-[4/3] p-3" style={{ background: item.cover, color: item.id === "light" || item.id === "sand" ? "#1c1915" : "#f4efe6" }}>
                  <p className="text-[0.55rem] uppercase tracking-widest opacity-70">{t("brand")}</p>
                  <p className="font-display mt-2 text-sm leading-tight">{title || t("catalogs.createTitle")}</p>
                  <p className="mt-1 line-clamp-2 text-[0.6rem] opacity-75">{subtitle}</p>
                </div>
                <p className="bg-white px-2 py-1 text-xs">{t(item.labelKey)}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
