"use client";

import type { ReactNode } from "react";

export const ADMIN_GRID_CLASS =
  "mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

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
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-[#f3efe8]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[0.65rem] leading-snug text-ink/40">{placeholder}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <h2 className="line-clamp-2 text-[0.8125rem] font-medium leading-snug text-ink">{title}</h2>
        {meta ? <p className="mt-0.5 line-clamp-1 text-[0.6875rem] text-ink/50">{meta}</p> : null}
        {badges ? <div className="mt-1.5 flex flex-wrap gap-1">{badges}</div> : null}
        <div className="mt-auto flex flex-wrap gap-1 pt-2">{actions}</div>
      </div>
    </article>
  );
}
