"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18n";

const BTN =
  "fixed top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-paper/95 text-ink shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-30";

export function FlipSideButtons({
  page,
  total,
  onPrev,
  onNext,
  hidden,
}: {
  page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  hidden?: boolean;
}) {
  const { t } = useI18n();
  if (hidden) return null;
  return (
    <>
      <button type="button" className={`${BTN} left-2 sm:left-4`} aria-label={t("catalog.turnPrev")} disabled={page <= 0} onClick={onPrev}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" className={`${BTN} right-2 sm:right-4`} aria-label={t("catalog.turnNext")} disabled={page >= total - 1} onClick={onNext}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}
