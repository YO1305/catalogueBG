"use client";

import { useI18n } from "@/components/i18n/I18n";
import { formatSaveClock, savePhaseText, type FabricSavePhase, type SaveReceipt } from "@/lib/fabricSavePhase";

export function FabricSaveStatus({ phase, receipt }: { phase: FabricSavePhase; receipt: SaveReceipt | null }) {
  const { t } = useI18n();
  const text = savePhaseText(t, phase);
  const status = receipt ? t(`designs.statusBanner.${receipt.status}`) : "";
  const time = receipt ? formatSaveClock(receipt.at) : "";
  const banner = !receipt || phase.step === "error"
    ? ""
    : receipt.names.length
      ? t("designs.saveBanner", { time, status, names: receipt.names.join(", ") })
      : t("designs.saveBannerEmpty", { time, status });
  return (
    <>
      {text ? (
        <p className={phase.step === "error" ? "w-full text-sm text-red-700" : "w-full text-sm text-ink/70"} role="status" aria-live="polite">
          {text}
        </p>
      ) : null}
      {banner ? <p className="w-full rounded-sm border border-emerald-700/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{banner}</p> : null}
    </>
  );
}
