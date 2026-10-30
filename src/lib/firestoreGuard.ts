import "server-only";

export class FirestoreQuotaError extends Error {
  readonly code = "quota" as const;
  constructor() {
    super("quota");
    this.name = "FirestoreQuotaError";
  }
}

export class FirestoreTimeoutError extends Error {
  constructor() {
    super("firestore_timeout");
    this.name = "FirestoreTimeoutError";
  }
}

const FIRESTORE_MS = 10_000;

export function isFirestoreQuotaError(error: unknown): boolean {
  if (error instanceof FirestoreQuotaError) return true;
  const code = (error as { code?: unknown } | null)?.code;
  const status = (error as { status?: unknown } | null)?.status;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    code === 8 ||
    code === "8" ||
    code === "resource-exhausted" ||
    status === "RESOURCE_EXHAUSTED" ||
    /RESOURCE_EXHAUSTED|resource-exhausted|Quota exceeded|exceeded your quota/i.test(message)
  );
}

export async function withFirestoreGuard<T>(start: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      start(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new FirestoreTimeoutError()), FIRESTORE_MS);
      }),
    ]);
    return result;
  } catch (error) {
    if (error instanceof FirestoreQuotaError || error instanceof FirestoreTimeoutError) {
      if (error instanceof FirestoreQuotaError) {
        const { tripWriteBrake } = await import("@/lib/telemetryBudget");
        tripWriteBrake();
      }
      throw error;
    }
    if (isFirestoreQuotaError(error)) {
      const { tripWriteBrake } = await import("@/lib/telemetryBudget");
      tripWriteBrake();
      throw new FirestoreQuotaError();
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function actionErrorFromUnknown(error: unknown): "quota" | "timeout" | "server" {
  if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) return "quota";
  if (error instanceof FirestoreTimeoutError) return "timeout";
  return "server";
}

export async function catchQuota<T>(fn: () => Promise<T>): Promise<T | { ok: false; error: "quota" | "timeout" }> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) {
      return { ok: false as const, error: "quota" as const };
    }
    if (error instanceof FirestoreTimeoutError) {
      return { ok: false as const, error: "timeout" as const };
    }
    throw error;
  }
}

export function quotaJsonResponse() {
  return Response.json({ ok: false, error: "quota" }, { status: 429 });
}

export function firestoreFailJson(error: unknown): Response | null {
  if (error instanceof FirestoreQuotaError || isFirestoreQuotaError(error)) return quotaJsonResponse();
  if (error instanceof FirestoreTimeoutError) {
    return Response.json({ ok: false, error: "timeout" }, { status: 504 });
  }
  return null;
}
