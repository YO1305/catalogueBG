"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";

type SourceRow = { name: string; reads: number; writes: number; deletes: number; total: number };

type Payload = {
  configured: boolean;
  dayKey: string;
  limits: { reads: number; writes: number };
  usage: { reads: number; writes: number; deletes: number };
  topSources: SourceRow[];
  hourly: Array<{ hour: string; reads: number; writes: number; deletes: number }>;
};

function barClass(ratio: number) {
  if (ratio >= 1) return "bg-red-600";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-majolica";
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = limit > 0 ? used / limit : 0;
  return (
    <li className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-ink/65">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full transition-all ${barClass(ratio)}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
      </div>
    </li>
  );
}

export function FirestoreUsageScreen() {
  const { t } = useI18n();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/firestore-usage");
        if (!response.ok) throw new Error("firestore-usage");
        const json = (await response.json()) as Payload;
        if (alive) setData(json);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const maxHourlyReads = useMemo(() => {
    if (!data?.hourly.length) return 1;
    return Math.max(1, ...data.hourly.map((row) => row.reads + row.writes));
  }, [data]);

  if (loading) return <p className="text-sm text-ink/60">{t("common.loading")}</p>;
  if (error || !data) return <p className="text-sm text-red-700">{t("firestoreUsage.loadError")}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/70">{t("firestoreUsage.intro")}</p>
      <p className="text-xs text-ink/50">{t("firestoreUsage.dayKey", { day: data.dayKey })}</p>
      {!data.configured ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t("firestoreUsage.localMode")}</p> : null}
      <ul className="space-y-4">
        <UsageBar label={t("firestoreUsage.reads")} used={data.usage.reads} limit={data.limits.reads} />
        <UsageBar label={t("firestoreUsage.writes")} used={data.usage.writes} limit={data.limits.writes} />
      </ul>
      {data.topSources.length ? (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <h3 className="font-medium">{t("firestoreUsage.topSources")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topSources.map((row) => (
              <li key={row.name} className="flex flex-wrap justify-between gap-2 border-b border-ink/5 pb-2 last:border-0">
                <span className="font-mono text-xs text-ink/80">{row.name}</span>
                <span className="text-ink/65">
                  {t("firestoreUsage.sourceCounts", {
                    reads: String(row.reads),
                    writes: String(row.writes),
                    deletes: String(row.deletes),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-ink/55">{t("firestoreUsage.noSources")}</p>
      )}
      {data.hourly.length ? (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <h3 className="font-medium">{t("firestoreUsage.hourly")}</h3>
          <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
            {data.hourly.map((row) => {
              const total = row.reads + row.writes;
              const height = Math.max(4, Math.round((total / maxHourlyReads) * 96));
              return (
                <div key={row.hour} className="flex min-w-[28px] flex-col items-center gap-1" title={`${row.hour}: ${total}`}>
                  <div className="w-5 rounded-t bg-majolica/80" style={{ height }} />
                  <span className="text-[10px] text-ink/45">{row.hour.slice(-2)}h</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="text-xs text-ink/50">{t("firestoreUsage.footer")}</p>
    </div>
  );
}
