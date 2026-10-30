"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { CatalogStats } from "@/lib/analytics";
import type { Catalog, Fabric } from "@/types";

export function StatsScreen({
  catalogs,
  selected,
  summary,
  fabrics,
  from,
  to,
}: {
  catalogs: Catalog[];
  selected: string;
  summary: CatalogStats;
  fabrics: Fabric[];
  from: string;
  to: string;
}) {
  const { lang, t } = useI18n();
  const cards = [
    [t("stats.opens"), summary.opens],
    [t("stats.unique"), summary.unique],
    [t("stats.avgPages"), summary.avgPages],
    [t("stats.zooms"), summary.zooms],
    [t("stats.leads"), summary.leads],
    [t("stats.conversion"), `${summary.conversion}%`],
  ];
  return (
    <div>
      <h1 className="font-display text-4xl">{t("stats.title")}</h1>
      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-ink/50">{t("stats.pick")}</span>
          <select className="h-10 border bg-white px-2" name="slug" defaultValue={selected}>
            {catalogs.map((catalog) => (
              <option key={catalog.slug} value={catalog.slug}>
                {catalog.title[lang]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-ink/50">{t("stats.from")}</span>
          <input className="h-10 border bg-white px-2" type="date" name="from" defaultValue={from} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-ink/50">{t("stats.to")}</span>
          <input className="h-10 border bg-white px-2" type="date" name="to" defaultValue={to} />
        </label>
        <button className="h-10 bg-majolica px-4 text-sm text-paper" type="submit">
          {t("stats.apply")}
        </button>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="bg-white p-4">
            <div className="text-xs uppercase text-ink/50">{label}</div>
            <div className="font-display text-3xl">{value}</div>
          </div>
        ))}
      </div>
      <h2 className="mt-8 font-display text-2xl">{t("stats.top")}</h2>
      <ol className="mt-3 space-y-2">
        {summary.top.map((row) => {
          const fabric = fabrics.find((item) => item.id === row.fabricId);
          return (
            <li key={row.fabricId} className="flex justify-between bg-white px-3 py-2 text-sm">
              <span>{fabric ? `${fabric.art} ${fabric.name[lang]}` : row.fabricId}</span>
              <span className="font-mono">{row.count}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
