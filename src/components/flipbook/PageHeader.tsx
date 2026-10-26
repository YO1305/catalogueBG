"use client";

import { useState } from "react";
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

export function CatalogImage({
  src,
  alt,
  active,
  thumbUrl,
  webUrl,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  active: boolean;
  thumbUrl?: string;
  webUrl?: string;
  fallbackSrc?: string;
}) {
  const [failed, setFailed] = useState(false);
  const display = failed && fallbackSrc ? fallbackSrc : src;
  if (!active || !display) return <div className="h-full w-full bg-black/5" />;
  const hasVariants = Boolean(thumbUrl && webUrl && !failed);
  const srcSet = hasVariants ? `${thumbUrl} 800w, ${webUrl} 1200w, ${src} 2000w` : undefined;
  return (
    // Catalog images use explicit WebP srcset widths from the spec when mockup variants exist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={display}
      srcSet={srcSet}
      sizes="(max-width: 1024px) 92vw, 40vw"
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => {
        if (!failed && fallbackSrc && fallbackSrc !== display) setFailed(true);
      }}
    />
  );
}
