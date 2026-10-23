import "server-only";
import { buildSystemPrompt, fallbackTranslate } from "@/lib/glossary";
import type { GlossaryTerm } from "@/types";

export type TranslateFields = Record<string, string>;

function parseJson(raw: string) {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return JSON.parse(cleaned) as { en?: TranslateFields; uz?: TranslateFields };
}

export async function translateFields(fields: TranslateFields, terms: GlossaryTerm[]) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    const en: TranslateFields = {};
    const uz: TranslateFields = {};
    for (const [name, value] of Object.entries(fields)) {
      en[name] = fallbackTranslate(value, "en", terms);
      uz[name] = fallbackTranslate(value, "uz", terms);
    }
    return { en, uz, engine: "fallback" as const };
  }
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
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(content);
  return { en: parsed.en ?? {}, uz: parsed.uz ?? {}, engine: "groq" as const };
}
