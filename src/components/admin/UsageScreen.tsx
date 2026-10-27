"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import type { UsageSnapshot } from "@/lib/vercelUsage";
import type { UsageMetricLimit } from "@/lib/vercelPlanLimits";

type Payload = { snapshot: UsageSnapshot; limits: UsageMetricLimit[] };

function barClass(level: string) {
  if (level === "critical") return "bg-red-600";
  if (level === "warn") return "bg-amber-500";
  return "bg-majolica";
}

export function UsageScreen() {
  const { t } = useI18n();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/usage");
        if (!response.ok) throw new Error("usage");
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

  if (loading) return <p className="text-sm text-ink/60">{t("common.loading")}</p>;
  if (error || !data) return <p className="text-sm text-red-700">{t("usage.loadError")}</p>;

  const { snapshot, limits } = data;
  const gb = snapshot.blob.bytes / (1024 ** 3);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/70">{t(`usage.plan.${snapshot.plan}`)}</p>
      {snapshot.blob.noteKey ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t(snapshot.blob.noteKey)}</p> : null}
      <div className="rounded-xl border border-ink/10 bg-white p-4">
        <h3 className="font-medium">{t("usage.blobTitle")}</h3>
        <p className="mt-1 text-sm text-ink/65">
          {t("usage.blobObjects", { count: String(snapshot.blob.objects) })} · {gb.toFixed(2)} GB
        </p>
      </div>
      <ul className="space-y-4">
        {limits.map((limit) => {
          const metric = snapshot.metrics.find((item) => item.id === limit.id);
          const used = metric?.used ?? 0;
          const included = limit.included;
          const level = metric?.level ?? "ok";
          const ratio = included > 0 ? Math.min(used / included, 1.5) : 0;
          const measured = metric?.measured ?? false;
          return (
            <li key={limit.id} className="rounded-xl border border-ink/10 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{t(limit.labelKey)}</span>
                <span className="text-sm text-ink/65">
                  {measured ? used.toFixed(limit.id === "blobStorageGb" ? 2 : 0) : "—"} / {included > 0 ? included : "∞"} {t(limit.unitKey)}
                </span>
              </div>
              {included > 0 ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className={`h-full rounded-full transition-all ${barClass(level)}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink/55">{t("usage.proMetered")}</p>
              )}
              {level === "warn" ? <p className="mt-2 text-sm text-amber-800">{t("usage.warn")}</p> : null}
              {level === "critical" ? <p className="mt-2 text-sm text-red-800">{t("usage.over")}</p> : null}
              {limit.overageKey ? <p className="mt-2 text-xs text-ink/55">{t(limit.overageKey)}</p> : null}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-ink/50">{t("usage.footer")}</p>
    </div>
  );
}
