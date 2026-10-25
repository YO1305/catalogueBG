"use client";

import { useI18n } from "@/components/i18n/I18n";
import { PageFooter } from "@/components/flipbook/PageFooter";
import type { BuiltPage, Catalog, Collection, FabricType } from "@/types";

export function PageSection({ page, catalog, fabricTypes, collections }: { page: Extract<BuiltPage, { kind: "section" }>; catalog: Catalog; fabricTypes: FabricType[]; collections: Collection[] }) {
  const { lang, t } = useI18n();
  const group = page.group === "collection" ? collections.find((item) => item.id === page.groupId) : fabricTypes.find((item) => item.id === page.groupId);
  const title = group?.name[lang] ?? page.groupId;
  const blurb = t(`blurb.${page.groupId}`) === `blurb.${page.groupId}` ? t("blurb.fallback") : t(`blurb.${page.groupId}`);
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-end px-[8%] py-[10%]">
      <p className="font-mono text-[0.75em] uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>
        {t("brand")}
      </p>
      <h2 className="font-display mt-[0.2em] text-[3em] uppercase leading-none">{title}</h2>
      <p className="mt-[0.8em] max-w-[18em] text-[1em] leading-relaxed" style={{ color: "var(--muted)" }}>
        {blurb}
      </p>
      </div>
      <PageFooter catalog={catalog} />
    </div>
  );
}
