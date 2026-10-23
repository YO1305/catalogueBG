"use client";

import { useI18n } from "@/components/i18n/I18n";

export function PageHeader({ title, page }: { title: string; page: number }) {
  const { t } = useI18n();
  return (
    <header className="flex items-center justify-between border-b px-[6%] py-[3%] text-[0.72em] uppercase tracking-[0.16em]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
      <span>
        {t("brand")} · {title}
      </span>
      <span>{t("catalog.page", { page })}</span>
    </header>
  );
}

export function CatalogImage({ src, alt, active }: { src: string; alt: string; active: boolean }) {
  if (!active || !src) return <div className="h-full w-full bg-black/5" />;
  const stem = src.replace(/\.webp$/, "");
  return (
    // Catalog images use explicit WebP srcset widths from the spec.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} srcSet={`${stem}-600.webp 600w, ${stem}-1200.webp 1200w, ${src} 2000w`} sizes="(max-width: 1024px) 92vw, 40vw" alt={alt} className="h-full w-full object-cover" />
  );
}
