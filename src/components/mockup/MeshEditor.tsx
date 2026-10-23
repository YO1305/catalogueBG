"use client";

import { useI18n } from "@/components/i18n/I18n";
import type { TemplateArea } from "@/types";

export function MeshEditor({ width, height, imageUrl, areas, onChange }: { width: number; height: number; imageUrl?: string; areas: TemplateArea[]; onChange: (areas: TemplateArea[]) => void }) {
  const { t } = useI18n();
  return (
    <div className="relative bg-sand" style={{ aspectRatio: `${width} / ${height}` }}>
      {imageUrl ? <img src={imageUrl} alt={t("templates.checker")} className="h-full w-full object-contain" /> : <div className="h-full min-h-48 w-full" />}
      {areas.map((area) => {
        const xs = [0, 2, 4, 6].map((index) => area.transform[index] ?? 0);
        const ys = [1, 3, 5, 7].map((index) => area.transform[index] ?? 0);
        const left = (Math.min(...xs) / width) * 100;
        const top = (Math.min(...ys) / height) * 100;
        const boxWidth = ((Math.max(...xs) - Math.min(...xs)) / width) * 100;
        const boxHeight = ((Math.max(...ys) - Math.min(...ys)) / height) * 100;
        return (
          <button key={area.id} type="button" className={`absolute border-2 ${area.fill ? "border-gold" : "border-white/50"}`} style={{ left: `${left}%`, top: `${top}%`, width: `${boxWidth}%`, height: `${boxHeight}%` }} onClick={() => onChange(areas.map((item) => item.id === area.id ? { ...item, fill: !item.fill } : item))}>
            <span className="bg-paper/90 px-1 text-xs">{area.label}</span>
          </button>
        );
      })}
    </div>
  );
}
