"use client";

import { useI18n } from "@/components/i18n/I18n";

export function FlipEdgeZones({ onPrev, onNext, hidden }: { onPrev: () => void; onNext: () => void; hidden?: boolean }) {
  const { t } = useI18n();
  if (hidden) return null;
  const edge = "absolute inset-y-0 z-20 w-[min(16%,4.25rem)] border-0 bg-transparent p-0";
  return (
    <>
      <button type="button" className={`${edge} left-0`} aria-label={t("catalog.prev")} onClick={onPrev} />
      <button type="button" className={`${edge} right-0`} aria-label={t("catalog.next")} onClick={onNext} />
    </>
  );
}
