"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { BuiltPage, Catalog, Collection, Fabric, FabricType } from "@/types";

export function PageToc({
  catalog,
  page,
  fabricTypes,
  collections,
  fabrics,
  onJump,
}: {
  catalog: Catalog;
  page: Extract<BuiltPage, { kind: "toc" }>;
  fabricTypes: FabricType[];
  collections: Collection[];
  fabrics: Fabric[];
  onJump: (index: number) => void;
}) {
  const { lang, t } = useI18n();
  const label = (entry: (typeof page.entries)[number]) => {
    if (entry.label === "back") return t("catalog.contacts");
    if (entry.label === "section") {
      const group = catalog.layout.sectionBy === "collection" ? collections.find((item) => item.id === entry.id) : fabricTypes.find((item) => item.id === entry.id);
      return group?.name[lang] ?? entry.id;
    }
    return fabrics.find((item) => item.id === entry.id)?.name[lang] ?? entry.id;
  };
  return (
    <div className="flex h-full flex-col">
      <header className="px-[8%] pt-[8%] font-display text-[2em]">{t("catalog.contents")}</header>
      <ul className="mt-[1em] flex-1 px-[8%]">
        {page.entries.map((entry) => (
          <li key={`${entry.target}-${entry.id}`}>
            <button type="button" className="flex w-full items-baseline gap-3 border-b py-[0.55em] text-left text-[0.95em]" style={{ borderColor: "var(--line)" }} onClick={() => onJump(entry.target - 1)}>
              <span className="flex-1">{label(entry)}</span>
              <span className="font-mono text-[0.8em]" style={{ color: "var(--muted)" }}>
                {entry.target}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
