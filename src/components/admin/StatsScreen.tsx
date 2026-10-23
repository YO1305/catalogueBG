"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { summarizeCatalog } from "@/lib/analytics";
import type { AnalyticsEvent, Catalog, Fabric, Lead } from "@/types";

export function StatsScreen({ catalogs, events, leads, fabrics }: { catalogs: Catalog[]; events: AnalyticsEvent[]; leads: Lead[]; fabrics: Fabric[] }) {
  const { lang, t } = useI18n();
  const [slug, setSlug] = useState(catalogs[0]?.slug ?? "");
  const stats = summarizeCatalog(slug, events, leads);
  const cards = [
    [t("stats.opens"), stats.opens],
    [t("stats.unique"), stats.unique],
    [t("stats.avgPages"), stats.avgPages],
    [t("stats.zooms"), stats.zooms],
    [t("stats.leads"), stats.leads],
    [t("stats.conversion"), `${stats.conversion}%`],
  ];
  return (
    <div>
      <h1 className="font-display text-4xl">{t("stats.title")}</h1>
      <select className="mt-4 h-10 border bg-white px-2" value={slug} onChange={(event) => setSlug(event.target.value)}>
        {catalogs.map((catalog) => (
          <option key={catalog.slug} value={catalog.slug}>
            {catalog.title[lang]}
          </option>
        ))}
      </select>
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
        {stats.top.map((row) => {
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
