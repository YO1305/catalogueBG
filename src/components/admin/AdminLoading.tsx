"use client";

import { ADMIN_GRID_CLASS } from "@/components/admin/AdminMarketplaceCard";
import { useI18n } from "@/components/i18n/I18n";

export function AdminLoading() {
  const { t } = useI18n();
  return (
    <div className="max-w-[1600px]" aria-busy="true">
      <p className="sr-only" role="status">{t("common.loading")}</p>
      <div className="h-9 w-48 animate-pulse rounded-md bg-black/[0.07]" />
      <div className="mt-5 flex flex-wrap gap-2">
        <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-black/[0.06]" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-black/[0.06]" />
      </div>
      <ul className={ADMIN_GRID_CLASS}>
        {Array.from({ length: 12 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
            <div className="aspect-square animate-pulse bg-black/[0.05]" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-black/[0.07]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-black/[0.05]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
