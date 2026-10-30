"use client";

import { toast } from "sonner";

export const ADMIN_ACTION_MS = 20_000;

export class ActionTimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "ActionTimeoutError";
  }
}

type Translate = (key: string) => string;

export async function withActionTimeout<T>(promise: Promise<T>, ms = ADMIN_ACTION_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ActionTimeoutError()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function toastAdminFailure(t: Translate, error: unknown, code?: string) {
  if (error instanceof ActionTimeoutError || code === "timeout") {
    toast(t("error.timeout"));
    return;
  }
  if (code === "quota") {
    toast(t("error.quota"));
    return;
  }
  toast(t("error.network"));
}

function failCode(result: unknown): string | undefined {
  if (!result || typeof result !== "object" || !("error" in result)) return undefined;
  const code = (result as { error?: unknown }).error;
  return typeof code === "string" ? code : undefined;
}

export function isQuotaFail(result: unknown): boolean {
  return failCode(result) === "quota";
}

export function isHandledActionFail(result: unknown): boolean {
  const code = failCode(result);
  return code === "quota" || code === "timeout";
}

/** Runs a server action with a 20s cap. Timeout/quota/network toasts are shown here. */
export async function runAdminAction<T>(t: Translate, start: () => Promise<T>): Promise<T | undefined> {
  try {
    const result = await withActionTimeout(start());
    const code = failCode(result);
    if (code === "quota") {
      toast(t("error.quota"));
      return result;
    }
    if (code === "timeout") {
      toast(t("error.timeout"));
      return result;
    }
    return result;
  } catch (error) {
    toastAdminFailure(t, error);
    return undefined;
  }
}
