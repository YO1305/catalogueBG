"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { updateLeadAction } from "@/lib/actions";
import { isQuotaFail, runAdminAction } from "@/lib/runAdminAction";
import type { Fabric, Lead } from "@/types";

export function LeadsTable({ initial, fabrics }: { initial: Lead[]; fabrics: Fabric[] }) {
  const { t } = useI18n();
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState("");
  const rows = useMemo(() => leads.filter((lead) => !filter || lead.catalogSlug === filter), [leads, filter]);
  return (
    <div>
      <h1 className="font-display text-4xl">{t("leads.title")}</h1>
      <select className="mt-4 h-10 border bg-white px-2" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="">{t("common.all")}</option>
        {[...new Set(leads.map((lead) => lead.catalogSlug))].map((slug) => <option key={slug}>{slug}</option>)}
      </select>
      {!rows.length ? <p className="mt-6">{t("leads.empty")}</p> : null}
      <div className="mt-4 overflow-auto">
        <table className="w-full min-w-[720px] bg-white text-sm">
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="border-b align-top">
                <td className="p-3">{lead.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{lead.catalogSlug}</td>
                <td className="p-3">{lead.name}<div className="text-ink/60">{lead.contact}</div></td>
                <td className="p-3">
                  {(lead.fabricIds ?? []).map((id) => {
                    const fabric = fabrics.find((item) => item.id === id);
                    return fabric ? <a key={id} className="block underline" href={`/c/${lead.catalogSlug}/d/${fabric.art}`}>{fabric.art}</a> : null;
                  })}
                </td>
                <td className="p-3">
                  <select value={lead.status} onChange={async (event) => {
                    const status = event.target.value as Lead["status"];
                    const previous = lead.status;
                    const result = await runAdminAction(t, () => updateLeadAction(lead.id, status));
                    if (!result || isQuotaFail(result) || !result.ok) {
                      event.target.value = previous;
                      return;
                    }
                    setLeads((items) => items.map((item) => (item.id === lead.id ? { ...item, status } : item)));
                  }}>
                    <option value="new">{t("leads.statusNew")}</option>
                    <option value="in_work">{t("leads.statusWork")}</option>
                    <option value="done">{t("leads.statusDone")}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
