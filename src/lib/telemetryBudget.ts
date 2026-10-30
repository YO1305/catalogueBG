import "server-only";

export const TELEMETRY_FLUSH_MS = 15 * 60 * 1000;
export const TELEMETRY_MIN_EVENTS = 50;
export const TELEMETRY_MAX_WRITES_PER_HOUR = 4;
export const WRITE_BRAKE_LIMIT = 15_000;

let hourStartedAt = Date.now();
let slotsUsed = 0;
let frozenDay: string | null = null;
let brakeCheckedAt = 0;

export function pacificDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function pacificHourKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}`;
}

export function shouldFlushTelemetry(eventCount: number, lastFlushAt: number, now = Date.now()): boolean {
  if (eventCount <= 0) return false;
  if (now - lastFlushAt < TELEMETRY_FLUSH_MS) return false;
  return eventCount > TELEMETRY_MIN_EVENTS;
}

export function isWriteBrakeOn(day = pacificDayKey()): boolean {
  return frozenDay === day;
}

export function tripWriteBrake(day = pacificDayKey()): void {
  if (frozenDay === day) return;
  frozenDay = day;
  void persistBrakeFlag(day);
}

export function takeTelemetryWriteSlot(): boolean {
  if (isWriteBrakeOn()) return false;
  const now = Date.now();
  if (now - hourStartedAt >= 3_600_000) {
    hourStartedAt = now;
    slotsUsed = 0;
  }
  if (slotsUsed >= TELEMETRY_MAX_WRITES_PER_HOUR) return false;
  slotsUsed += 1;
  return true;
}

export async function writeBrakeActive(): Promise<boolean> {
  const day = pacificDayKey();
  if (frozenDay === day) return true;
  const now = Date.now();
  if (now - brakeCheckedAt < 60_000) return false;
  brakeCheckedAt = now;
  try {
    const { readJsonBlob } = await import("@/lib/telemetryBlob");
    const flag = await readJsonBlob<{ frozen?: boolean }>(`telemetry/brake-${day}.json`);
    if (flag?.frozen) {
      frozenDay = day;
      return true;
    }
    const usage = await readJsonBlob<{ writes?: number }>(`telemetry/usage-${day}.json`);
    if ((usage?.writes ?? 0) >= WRITE_BRAKE_LIMIT) {
      tripWriteBrake(day);
      return true;
    }
  } catch {
    return isWriteBrakeOn(day);
  }
  return false;
}

async function persistBrakeFlag(day: string) {
  try {
    const { writeJsonBlob } = await import("@/lib/telemetryBlob");
    await writeJsonBlob(`telemetry/brake-${day}.json`, { frozen: true, at: new Date().toISOString() });
  } catch (error) {
    console.error("telemetry brake flag", error);
  }
}
