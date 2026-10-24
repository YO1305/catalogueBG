"use client";

import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { useI18n } from "@/components/i18n/I18n";
import type { Collection, FabricType } from "@/types";

export function FabricCategorySection({
  collectionId,
  collections,
  fabricTypes,
  fabricTypeId,
  onCollection,
  onCreateCollection,
}: {
  collectionId: string;
  collections: Collection[];
  fabricTypes: FabricType[];
  fabricTypeId: string;
  onCollection: (id: string) => void;
  onCreateCollection: (name: string, extra?: { auto?: boolean }) => Promise<Collection | null>;
}) {
  const { t } = useI18n();
  const typeName = fabricTypes.find((item) => item.id === fabricTypeId)?.name.ru;
  return (
    <section className="rounded-sm border border-black/10 bg-white/80 p-4">
      <h2 className="font-display text-lg">{t("designs.category")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("designs.categoryHint")}</p>
      <div className="mt-3 max-w-md">
        <CreatableSelect
          label={t("designs.category")}
          value={collectionId}
          options={collections.filter((item) => item.active)}
          onChange={onCollection}
          onCreate={onCreateCollection}
          extra={{ label: "", options: [], auto: true }}
        />
      </div>
      {typeName ? <p className="mt-2 text-xs text-ink/50">{t("designs.mockupsForType", { type: typeName })}</p> : null}
    </section>
  );
}
