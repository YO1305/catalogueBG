"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ADMIN_GRID_CLASS =
  "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

const actionBase =
  "inline-flex h-8 items-center justify-center rounded-md border text-xs font-medium leading-none whitespace-nowrap transition-colors";

const tones = {
  default: "border-black/10 bg-white text-ink hover:border-black/20 hover:bg-[#faf8f4]",
  primary: "border-majolica/20 bg-majolica/[0.06] text-majolica hover:bg-majolica/[0.12]",
  danger: "border-red-200 bg-white text-red-800 hover:border-red-300 hover:bg-red-50",
} as const;

/** Text action that fills the row next to one square icon action. */
export function cardActionClass(tone: keyof typeof tones = "default") {
  return cn(actionBase, "min-w-0 flex-1 basis-[calc(100%-2.375rem)] truncate px-2", tones[tone]);
}

export function cardIconActionClass(tone: keyof typeof tones = "default") {
  return cn(actionBase, "w-8 shrink-0", tones[tone]);
}

export const cardSelectClass = cn(actionBase, "min-w-0 flex-1 basis-[calc(100%-2.375rem)] cursor-pointer appearance-none truncate px-2.5 text-left", tones.default);

export function AdminPageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl leading-tight md:text-3xl">{title}</h1>
      {action}
    </div>
  );
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-col gap-2 rounded-xl border border-black/[0.06] bg-white/70 p-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function AdminMarketplaceCard({
  image,
  placeholder,
  title,
  meta,
  badges,
  actions,
}: {
  image?: string;
  placeholder: string;
  title: string;
  meta?: string;
  badges?: ReactNode;
  actions: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(image?.trim()) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-[#f3efe8]">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs leading-snug text-ink/40">{placeholder}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h2 className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-tight text-ink">{title}</h2>
        {meta ? <p className="truncate text-xs leading-tight text-ink/50">{meta}</p> : null}
        {badges ? <div className="flex flex-wrap items-center gap-1">{badges}</div> : null}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1.5">{actions}</div>
      </div>
    </article>
  );
}
