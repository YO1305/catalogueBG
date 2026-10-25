import type { GlossaryTerm } from "@/types";

const BASE_PROMPT = `You are a professional textile translator for BAHMAL HOME, a textile manufacturer from Uzbekistan.
Translate Russian product copy into English (and Uzbek Latin script). Keep it concise, B2B-catalog style, British spelling.
STRICTLY use this glossary; never translate these terms differently:
{glossary}
Brand and design names in «» are transliterated, not translated (Лаванда → Lavanda).
Return ONLY valid JSON matching the input keys. Shape: {"en":{...},"uz":{...}} with the same keys as the input.`;

export function glossaryLine(terms: GlossaryTerm[]) {
  return terms.map((term) => `${term.ru}=${term.en}`).join("; ");
}

export function buildSystemPrompt(terms: GlossaryTerm[]) {
  return BASE_PROMPT.replace("{glossary}", glossaryLine(terms));
}

export function transliterateName(input: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return Array.from(input)
    .map((ch) => map[ch.toLowerCase()] ?? ch)
    .join("");
}

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keepCase(source: string, dest: string) {
  const first = source.charAt(0);
  if (!dest || first === first.toLowerCase()) return dest;
  return dest.charAt(0).toUpperCase() + dest.slice(1);
}

export function fallbackTranslate(text: string, target: "en" | "uz", terms: GlossaryTerm[]) {
  let output = text.replace(/«([^»]+)»/g, (_match, name: string) => `«${transliterateName(name)}»`);
  const sorted = [...terms].sort((a, b) => b.ru.length - a.ru.length);
  for (const term of sorted) {
    const dest = target === "en" ? term.en : term.uz;
    output = output.replace(new RegExp(escapeReg(term.ru), "gi"), (match) => keepCase(match, dest));
  }
  return output.replace(/[А-Яа-яЁё]/g, (ch) => transliterateName(ch));
}

const SUSPECTS = ["хлопок", "полиэстер", "вискоза", "лён", "шелк", "бамбук", "ранфорс", "перкаль", "саржа", "жаккард", "муслин"];

export function suspectTerms(text: string, terms: GlossaryTerm[]) {
  const known = new Set(terms.map((term) => term.ru.toLowerCase()));
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const word of SUSPECTS) {
    if (lower.includes(word) && !known.has(word)) found.add(word);
  }
  return [...found];
}
