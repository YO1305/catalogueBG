"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/I18n";
import type { Fabric } from "@/types";

export function CatalogMissingMockups({ fabrics }: { fabrics: Fabric[] }) {
  const { t } = useI18n();
  if (!fabrics.length) return null;
  return (
    <div className="rounded-md border border-amber-300/70 bg-amber-50 p-2">
      <p className="text-xs font-medium text-amber-950">{t("catalogs.noMockupList")}</p>
      <ul className="mt-2 space-y-1">
        {fabrics.map((fabric) => (
          <li key={fabric.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-mono text-xs">{fabric.art}</span>
              {` · ${t("catalogs.noMockup")}`}
            </span>
            <Link href={`/admin/fabrics/${fabric.id}`} className="shrink-0 text-xs underline">
              {t("catalogs.makeMockup")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
