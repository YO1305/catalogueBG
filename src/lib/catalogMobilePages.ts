import type { BuiltPage } from "@/types";

export const MOBILE_DESIGNS_PER_PAGE = 2;

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** Re-chunk design spreads for narrow viewports (max 2 designs per page). */
export function remobileDesignPages(pages: BuiltPage[], perPage = MOBILE_DESIGNS_PER_PAGE): BuiltPage[] {
  const next: BuiltPage[] = [];
  let pending: string[] = [];

  function flushDesigns() {
    for (const fabricIds of chunkIds(pending, perPage)) {
      next.push({ kind: "designs", index: next.length, fabricIds });
    }
    pending = [];
  }

  for (const page of pages) {
    if (page.kind === "cover") {
      flushDesigns();
      next.push({ kind: "cover", index: next.length });
    } else if (page.kind === "section") {
      flushDesigns();
      next.push({ kind: "section", index: next.length, group: page.group, groupId: page.groupId });
    } else if (page.kind === "designs") {
      pending.push(...page.fabricIds);
    } else if (page.kind === "back") {
      flushDesigns();
      next.push({ kind: "back", index: next.length });
    }
  }
  return next;
}
