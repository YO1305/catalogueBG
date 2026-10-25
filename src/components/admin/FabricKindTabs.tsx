"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/I18n";
import { FABRIC_KINDS } from "@/lib/fabricKind";
import type { FabricKind } from "@/types";

export function FabricKindTabs({ value, counts }: { value: FabricKind; counts: Record<FabricKind, number> }) {
  const { t } = useI18n();
  return (
    <nav className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-ink/[0.06] p-1 sm:inline-grid" aria-label={t("designs.kinds")}>
      {FABRIC_KINDS.map((kind) => (
        <Link
          key={kind}
          href={`/admin/fabrics?kind=${kind}`}
          aria-current={kind === value ? "page" : undefined}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-center text-sm leading-tight transition-colors ${kind === value ? "bg-white font-medium shadow-sm" : "text-ink/60 hover:text-ink"}`}
        >
          {t(`designs.kind.${kind}`)}
          <span className="text-xs text-ink/45">{counts[kind]}</span>
        </Link>
      ))}
    </nav>
  );
}
