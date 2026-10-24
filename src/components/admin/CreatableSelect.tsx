"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [auto, setAuto] = useState(true);
  const [ids, setIds] = useState<string[]>([]);
  const current = options.find((item) => item.id === value);
  const shown = options.filter((item) => {
    if (!query.trim()) return true;
    return optionLabel(item).toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    setQuery("");
    setListOpen(false);
  }, [value]);

  useEffect(() => {
    if (!listOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setListOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [listOpen]);

  const fieldValue = listOpen ? query : current ? optionLabel(current) : query;

  return (
    <div ref={rootRef}>
      <Label>{label}</Label>
      <Input
        value={fieldValue}
        placeholder={t("common.search")}
        aria-expanded={listOpen}
        aria-controls={listId}
        onChange={(event) => {
          setQuery(event.target.value);
          setListOpen(true);
        }}
        onFocus={() => setListOpen(true)}
      />
      {listOpen ? (
        <div id={listId} className="mt-1 max-h-40 overflow-auto border border-ink/10 bg-white shadow-sm">
          {shown.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm ${item.id === value ? "bg-sand font-medium" : "hover:bg-sand/40"}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item.id);
                setListOpen(false);
                setQuery("");
              }}
            >
              {optionLabel(item)}
            </button>
          ))}
          <button
            type="button"
            className="block w-full border-t px-3 py-2 text-left text-sm text-majolica"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setListOpen(false);
              setDialogOpen(true);
            }}
          >
            {t("wizard.addNew")}
          </button>
        </div>
      ) : null}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{t("wizard.addNew")}</DialogTitle>
          <div className="mt-4 space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={t("common.name")} />
            {extra?.auto ? <Checkbox checked={auto} onCheckedChange={setAuto} label={t("settings.autoCatalog")} /> : null}
            {extra ? (
              <div className="space-y-1">
                <p className="text-xs uppercase text-ink/50">{extra.label}</p>
                {extra.options.map((option) => (
                  <Checkbox
                    key={option.id}
                    checked={ids.includes(option.id)}
                    label={option.label}
                    onCheckedChange={(checked) => setIds((currentIds) => (checked ? [...currentIds, option.id] : currentIds.filter((id) => id !== option.id)))}
                  />
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              onClick={async () => {
                const created = await onCreate(name, { auto, ids });
                if (created) onChange(created.id);
                setDialogOpen(false);
                setName("");
                setIds([]);
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
