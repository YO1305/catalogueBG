"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { createCollectionAction, createFabricTypeAction, createFinishAction, createProductTypeAction, removeDictionaryAction, removeFinishAction, reorderAction, reorderFinishesAction, saveCollectionAction, saveFabricTypeAction, saveFinishAction, saveGlossaryAction, saveProductTypeAction } from "@/lib/actions";
import { isWovenType } from "@/lib/mockup/weave";
import type { Collection, FabricType, Finish, GlossaryTerm, ProductType, Role } from "@/types";

type Row = { id: string; name: string; active: boolean; raw: object; flag?: boolean };

export function DirectoryScreen({ role, collections, fabricTypes, finishes, productTypes, glossary }: { role: Role; collections: Collection[]; fabricTypes: FabricType[]; finishes: Finish[]; productTypes: ProductType[]; glossary: GlossaryTerm[] }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"collections" | "types" | "finishes" | "products" | "glossary">("collections");
  const tabs = [
    ["collections", t("settings.collections")],
    ["types", t("settings.types")],
    ["finishes", t("settings.finishes")],
    ["products", t("settings.products")],
    ["glossary", t("settings.glossary")],
  ] as const;
  return (
    <div>
      <h1 className="font-display text-4xl">{t("nav.settings")}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`px-3 py-1 text-sm ${tab === id ? "bg-majolica text-paper" : "bg-white"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "collections" ? <Rows role={role} kind="collections" rows={collections.map((item) => ({ id: item.id, name: item.name.ru, active: item.active, raw: item }))} onHide={(item) => saveCollectionAction({ ...(item.raw as Collection), active: !item.active })} onDelete={(id) => removeDictionaryAction("collections", id)} onReorder={(ids) => reorderAction("collections", ids)} onCreate={(name) => createCollectionAction({ nameRu: name, autoCatalog: true })} /> : null}
      {tab === "types" ? <Rows role={role} kind="fabricTypes" rows={fabricTypes.map((item) => ({ id: item.id, name: item.name.ru, active: item.active, raw: item, flag: isWovenType(item) }))} flagLabel={t("settings.woven")} onFlag={(item) => saveFabricTypeAction({ ...(item.raw as FabricType), woven: !item.flag })} onHide={(item) => saveFabricTypeAction({ ...(item.raw as FabricType), active: !item.active })} onDelete={(id) => removeDictionaryAction("fabricTypes", id)} onReorder={(ids) => reorderAction("fabricTypes", ids)} onCreate={(name) => createFabricTypeAction({ nameRu: name, suggestedProductTypes: [] })} /> : null}
      {tab === "finishes" ? <Rows role={role} kind="finishes" rows={finishes.map((item) => ({ id: item.id, name: item.name.ru, active: item.active, raw: item, }))} onHide={(item) => saveFinishAction({ ...(item.raw as Finish), active: !item.active })} onDelete={(id) => removeFinishAction(id)} onReorder={(ids) => reorderFinishesAction(ids)} onCreate={(name) => createFinishAction({ nameRu: name })} /> : null}
      {tab === "products" ? <Rows role={role} kind="productTypes" rows={productTypes.map((item) => ({ id: item.id, name: item.name.ru, active: item.active, raw: item }))} onHide={(item) => saveProductTypeAction({ ...(item.raw as ProductType), active: !item.active })} onDelete={(id) => removeDictionaryAction("productTypes", id)} onReorder={(ids) => reorderAction("productTypes", ids)} onCreate={(name) => createProductTypeAction({ nameRu: name, suggestedFor: [] })} /> : null}
      {tab === "glossary" ? <GlossaryEditor role={role} initial={glossary} /> : null}
    </div>
  );
}

function Rows({ role, kind, rows, flagLabel, onFlag, onHide, onDelete, onReorder, onCreate }: { role: Role; kind: string; rows: Row[]; flagLabel?: string; onFlag?: (row: Row) => Promise<unknown>; onHide: (row: Row) => Promise<unknown>; onDelete: (id: string) => Promise<{ ok: boolean }>; onReorder: (ids: string[]) => Promise<unknown>; onCreate: (name: string) => Promise<unknown> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [items, setItems] = useState(rows);
  return (
    <div className="mt-4 space-y-2">
      {items.map((row, index) => (
        <div key={row.id} className="flex items-center justify-between bg-white px-3 py-2" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={async (event) => {
          const from = Number(event.dataTransfer.getData("text/plain"));
          const next = [...items];
          const [moved] = next.splice(from, 1);
          if (!moved) return;
          next.splice(index, 0, moved);
          setItems(next);
          await onReorder(next.map((item) => item.id));
        }}>
          <span>{row.name}{row.active ? "" : ` · ${t("common.hidden")}`}</span>
          <span className="flex flex-wrap items-center justify-end gap-2 text-sm">
            {onFlag && flagLabel ? (
              <label className="flex items-center gap-1 text-xs text-ink/70">
                <input type="checkbox" checked={Boolean(row.flag)} onChange={async () => { setItems(items.map((item) => (item.id === row.id ? { ...item, flag: !item.flag } : item))); await onFlag(row); router.refresh(); }} />
                {flagLabel}
              </label>
            ) : null}
            <button type="button" onClick={async () => { await onHide(row); router.refresh(); }}>{row.active ? t("common.hide") : t("common.add")}</button>
            {role === "admin" ? <button type="button" onClick={async () => { const result = await onDelete(row.id); if (!result.ok) return; router.refresh(); }}>{t("common.delete")}</button> : null}
          </span>
        </div>
      ))}
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await onCreate(name); setName(""); router.refresh(); }}>
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={kind} required />
        <Button type="submit">{t("common.add")}</Button>
      </form>
      <p className="text-xs text-ink/50">{t("settings.used")}</p>
    </div>
  );
}

function GlossaryEditor({ role, initial }: { role: Role; initial: GlossaryTerm[] }) {
  const { t } = useI18n();
  const [terms, setTerms] = useState(initial);
  const [draft, setDraft] = useState({ ru: "", en: "", uz: "" });
  return (
    <div className="mt-4 space-y-2">
      {terms.map((term) => (
        <div key={term.id} className="grid grid-cols-3 gap-2 bg-white p-2 text-sm">
          <span>{term.ru}</span><span>{term.en}</span><span>{term.uz}</span>
        </div>
      ))}
      {role === "admin" ? (
        <form className="grid gap-2 md:grid-cols-4" onSubmit={async (event) => {
          event.preventDefault();
          const next = [...terms, { id: crypto.randomUUID(), ...draft }];
          setTerms(next);
          await saveGlossaryAction(next);
          setDraft({ ru: "", en: "", uz: "" });
        }}>
          <Input placeholder={t("settings.ru")} value={draft.ru} onChange={(event) => setDraft({ ...draft, ru: event.target.value })} required />
          <Input placeholder="EN" value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} required />
          <Input placeholder="UZ" value={draft.uz} onChange={(event) => setDraft({ ...draft, uz: event.target.value })} required />
          <Button type="submit">{t("settings.addTerm")}</Button>
        </form>
      ) : null}
    </div>
  );
}
