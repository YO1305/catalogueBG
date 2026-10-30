import type { Fabric } from "@/types";

/** Stable fingerprint so autosave skips writes when only timestamps/persisted flags changed. */
export function fabricAutosaveHash(fabric: Fabric): string {
  const { persisted: _persisted, updatedAt: _updatedAt, createdAt: _createdAt, ...rest } = fabric;
  return JSON.stringify(rest);
}
