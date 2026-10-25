"use client";

export type MediaTab = { id: string; label: string; src: string; thumb: string };

export function MediaTiles({ tabs, value, onChange }: { tabs: MediaTab[]; value: number; onChange: (index: number) => void }) {
  if (tabs.length < 2) return null;
  return (
    <div className="shrink-0 overflow-x-auto px-3 py-3">
      <div className="mx-auto flex w-max gap-2">
        {tabs.map((item, index) => {
          const active = index === value;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              className={`flex h-14 shrink-0 items-center gap-2 rounded-xl border py-1 pl-1 pr-3 text-xs leading-none transition-colors ${
                active ? "border-majolica bg-majolica text-paper" : "border-ink/10 bg-white/70 text-ink hover:border-ink/30"
              }`}
              onClick={() => onChange(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumb || item.src} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
              <span className="max-w-[10rem] truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
