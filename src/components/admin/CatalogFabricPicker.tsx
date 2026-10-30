"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { listFabricPickerPageAction } from "@/lib/actions";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { FabricPickerRow } from "@/types";

export function CatalogFabricPicker({
  excludeIds,
  onPick,
}: {
  excludeIds: string[];
  onPick: (id: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [items, setItems] = useState<FabricPickerRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void listFabricPickerPageAction(debouncedQuery, null).then((page) => {
      if (cancelled) return;
      setItems(page.items);
      setCursor(page.cursor);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    const page = await listFabricPickerPageAction(debouncedQuery, cursor);
    setItems((current) => {
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...page.items.filter((item) => !seen.has(item.id))];
    });
    setCursor(page.cursor);
    setBusy(false);
  }

  const visible = items.filter((item) => !excludeIds.includes(item.id));

  return (
    <div className="mt-2 space-y-2">
      <input
        className="h-9 w-full border px-2 text-sm"
        value={query}
        placeholder={t("catalogs.searchFabrics")}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="max-h-40 overflow-auto border border-black/10">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-ink/5"
            onClick={() => onPick(item.id)}
          >
            {item.thumbUrl ? (
              <img src={item.thumbUrl} alt="" className="h-8 w-8 shrink-0 object-cover" />
            ) : (
              <span className="h-8 w-8 shrink-0 bg-ink/10" />
            )}
            <span className="min-w-0 truncate">
              <span className="font-mono text-xs">{item.art}</span> · {item.name.ru}
            </span>
          </button>
        ))}
        {!busy && visible.length === 0 ? (
          <p className="px-2 py-2 text-xs text-ink/50">{t("catalogs.noFabricsMatch")}</p>
        ) : null}
      </div>
      {cursor ? (
        <button type="button" className="text-xs underline" disabled={busy} onClick={() => void loadMore()}>
          {t("catalogs.loadMoreFabrics")}
        </button>
      ) : null}
    </div>
  );
}
