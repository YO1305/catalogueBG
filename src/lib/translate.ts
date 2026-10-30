import "server-only";
import { buildSystemPrompt, fallbackTranslate } from "@/lib/glossary";
import type { GlossaryTerm } from "@/types";

export type TranslateFields = Record<string, string>;

const GROQ_MS = 8_000;

function parseJson(raw: string) {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return JSON.parse(cleaned) as { en?: TranslateFields; uz?: TranslateFields };
}

function fallbackAll(fields: TranslateFields, terms: GlossaryTerm[]) {
  const en: TranslateFields = {};
  const uz: TranslateFields = {};
  for (const [name, value] of Object.entries(fields)) {
    en[name] = fallbackTranslate(value, "en", terms);
    uz[name] = fallbackTranslate(value, "uz", terms);
  }
  return { en, uz, engine: "fallback" as const };
}

export async function translateFields(fields: TranslateFields, terms: GlossaryTerm[]) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return fallbackAll(fields, terms);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        messages: [
          { role: "system", content: buildSystemPrompt(terms) },
          { role: "user", content: JSON.stringify(fields) },
        ],
      }),
      signal: AbortSignal.timeout(GROQ_MS),
    });
    if (!response.ok) return fallbackAll(fields, terms);
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content ?? "";
    const parsed = parseJson(content);
    return { en: parsed.en ?? {}, uz: parsed.uz ?? {}, engine: "groq" as const };
  } catch {
    return fallbackAll(fields, terms);
  }
}

export async function translateFieldsSafe(fields: TranslateFields, terms: GlossaryTerm[]) {
  try {
    return await translateFields(fields, terms);
  } catch {
    return fallbackAll(fields, terms);
  }
}
