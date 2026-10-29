"use client";

import type { CatalogSectionLink } from "@/lib/catalogSections";

export function CatalogSectionJumpBar({
  links,
  currentPage,
  onJump,
}: {
  links: CatalogSectionLink[];
  currentPage: number;
  onJump: (index: number) => void;
}) {
  if (!links.length) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-2 z-20 flex justify-center px-2 sm:top-3">
      <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-full border border-white/50 bg-[#f7f3ec]/95 px-2 py-1.5 shadow-md">
        {links.map((link, index) => {
          const end = links[index + 1]?.pageIndex ?? Number.POSITIVE_INFINITY;
          const active = currentPage >= link.pageIndex && currentPage < end;
          return (
          <button
            key={link.id}
            type="button"
            className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${active ? "bg-majolica text-paper" : "bg-ink/5 hover:bg-ink/10"}`}
            onClick={() => onJump(link.pageIndex)}
          >
            {link.title}
          </button>
          );
        })}
      </div>
    </div>
  );
}
