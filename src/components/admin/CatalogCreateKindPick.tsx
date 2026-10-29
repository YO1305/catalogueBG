"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/I18n";

export function CatalogCreateKindPick() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-lg py-10">
      <Link href="/admin/catalogs" className="text-sm underline">
        {t("common.back")}
      </Link>
      <h1 className="font-display mt-4 text-3xl">{t("catalogs.createTitle")}</h1>
      <p className="mt-2 text-sm text-ink/60">{t("catalogs.kindPickHint")}</p>
      <div className="mt-8 grid gap-4">
        <Link
          href="/admin/catalogs/new?kind=standard"
          className="block rounded-xl border border-black/10 bg-white p-5 shadow-sm transition hover:border-majolica/40"
        >
          <p className="font-display text-xl">{t("catalogs.kindStandard")}</p>
          <p className="mt-2 text-sm text-ink/60">{t("catalogs.kindStandardHint")}</p>
        </Link>
        <Link
          href="/admin/catalogs/new?kind=design"
          className="block rounded-xl border border-black/10 bg-white p-5 shadow-sm transition hover:border-majolica/40"
        >
          <p className="font-display text-xl">{t("catalogs.kindDesign")}</p>
          <p className="mt-2 text-sm text-ink/60">{t("catalogs.kindDesignHint")}</p>
        </Link>
      </div>
    </div>
  );
}
