"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Input, Label } from "@/components/ui/field";

export function CreatableSelect<T extends { id: string }>({
  label,
  value,
  options,
  onChange,
  onCreate,
  extra,
}: {
  label: string;
  value: string;
  options: T[];
  onChange: (id: string) => void;
  onCreate: (name: string, extra?: { auto?: boolean; ids: string[] }) => Promise<T | null>;
  extra?: { label: string; options: Array<{ id: string; label: string }>; auto?: boolean };
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [auto, setAuto] = useState(true);
  const [ids, setIds] = useState<string[]>([]);
  const current = options.find((item) => item.id === value);
  const shown = options.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <Label>{label}</Label>
      <Input value={query} placeholder={current ? optionLabel(current) : t("common.search")} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-1 max-h-40 overflow-auto border border-ink/10 bg-white">
        {shown.map((item) => (
          <button key={item.id} type="button" className={`block w-full px-3 py-2 text-left text-sm ${item.id === value ? "bg-sand" : ""}`} onClick={() => onChange(item.id)}>
            {optionLabel(item)}
          </button>
        ))}
        <button type="button" className="block w-full px-3 py-2 text-left text-sm text-majolica" onClick={() => setOpen(true)}>
          {t("wizard.addNew")}
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{t("wizard.addNew")}</DialogTitle>
          <div className="mt-4 space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={t("common.name")} />
            {extra?.auto ? <Checkbox checked={auto} onCheckedChange={setAuto} label={t("settings.autoCatalog")} /> : null}
            {extra ? (
              <div className="space-y-1">
                <p className="text-xs uppercase text-ink/50">{extra.label}</p>
                {extra.options.map((option) => (
                  <Checkbox key={option.id} checked={ids.includes(option.id)} label={option.label} onCheckedChange={(checked) => setIds((currentIds) => (checked ? [...currentIds, option.id] : currentIds.filter((id) => id !== option.id)))} />
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              onClick={async () => {
                const created = await onCreate(name, { auto, ids });
                if (created) onChange(created.id);
                setOpen(false);
                setName("");
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function optionLabel(item: object) {
  if ("name" in item && item.name && typeof item.name === "object" && "ru" in item.name) return String(item.name.ru);
  if ("name" in item) return String(item.name);
  return "";
}
