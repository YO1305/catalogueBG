"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { publicMediaSrc, publicMediaSrcSet } from "@/lib/publicMedia";

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
  const raw = failed && fallbackSrc ? fallbackSrc : src;
  const src1200 = failed ? raw : webUrl || raw;
  const src600 = failed ? undefined : thumbUrl;
  const display = publicMediaSrc(src1200);
  if (!active || !display) return <div className="h-full w-full bg-black/5" />;
  return (
    <img
      src={display}
      srcSet={publicMediaSrcSet(src600, src1200)}
      sizes="(max-width: 1024px) 92vw, 40vw"
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => {
        if (!failed && fallbackSrc && fallbackSrc !== raw) setFailed(true);
      }}
    />
  );
}
