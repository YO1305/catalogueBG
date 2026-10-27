"use client";

import { useMemo, useState } from "react";
import { AccessScreen } from "@/components/admin/AccessScreen";
import { DirectoryScreen } from "@/components/admin/DirectoryScreen";
import { UsageScreen } from "@/components/admin/UsageScreen";
import { useI18n } from "@/components/i18n/I18n";
import type { AdminSection, Collection, FabricType, Finish, GlossaryTerm, ProductType, PublicUser, Role } from "@/types";

type Tab = "directories" | "access" | "usage";

export function SettingsScreen({
  role,
  sessionSections,
  selfId,
  users,
  collections,
  fabricTypes,
  finishes,
  productTypes,
  glossary,
  initialTab,
}: {
  role: Role;
  sessionSections?: AdminSection[];
  selfId?: string;
  users: PublicUser[];
  collections: Collection[];
  fabricTypes: FabricType[];
  finishes: Finish[];
  productTypes: ProductType[];
  glossary: GlossaryTerm[];
  initialTab?: string;
}) {
  const { t } = useI18n();
  const can = (section: AdminSection) => {
    if (role === "admin") return true;
    return Boolean(sessionSections?.includes(section));
  };
  const tabs = useMemo(() => {
    const rows: Array<[Tab, string, boolean]> = [
      ["directories", t("settings.tabDirectories"), can("settings")],
      ["access", t("settings.tabAccess"), can("access")],
      ["usage", t("settings.tabUsage"), can("usage")],
    ];
    return rows.filter((row) => row[2]);
  }, [role, sessionSections, t]);
  const first = tabs[0]?.[0] ?? "directories";
  const safeInitial = tabs.some(([id]) => id === initialTab) ? (initialTab as Tab) : first;
  const [tab, setTab] = useState<Tab>(safeInitial);

  return (
    <div>
      <h1 className="font-display text-4xl">{t("nav.settings")}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`rounded-lg px-3 py-1 text-sm ${tab === id ? "bg-majolica text-paper" : "bg-white"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "directories" ? (
          <DirectoryScreen role={role} collections={collections} fabricTypes={fabricTypes} finishes={finishes} productTypes={productTypes} glossary={glossary} embedded />
        ) : null}
        {tab === "access" ? <AccessScreen users={users} selfId={selfId} /> : null}
        {tab === "usage" ? <UsageScreen /> : null}
      </div>
    </div>
  );
}
