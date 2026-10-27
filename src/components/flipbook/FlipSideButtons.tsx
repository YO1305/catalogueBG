"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18n";

function NavButton({ dir, disabled, onClick, label }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void; label: string }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="flex h-[3.75rem] w-[3.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-ink/10 bg-majolica text-paper shadow-[0_6px_24px_rgba(22,58,102,0.35)] transition hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35 sm:h-[4.5rem] sm:w-[4.5rem]"
      onClick={onClick}
    >
      <Icon className="h-8 w-8 stroke-[2.5] sm:h-9 sm:w-9" aria-hidden />
    </button>
  );
}

export function FlipSideNav({
  page,
  total,
  hidden,
  onPrev,
  onNext,
  children,
}: {
  page: number;
  total: number;
  hidden?: boolean;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  if (hidden) return <>{children}</>;
  return (
    <div className="flex max-w-[100vw] items-center gap-3 px-1 sm:gap-5 sm:px-2">
      <NavButton dir="prev" disabled={page <= 0} onClick={onPrev} label={t("catalog.turnPrev")} />
      <div className="min-w-0 shrink">{children}</div>
      <NavButton dir="next" disabled={page >= total - 1} onClick={onNext} label={t("catalog.turnNext")} />
    </div>
  );
}
