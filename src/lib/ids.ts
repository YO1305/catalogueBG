const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", ғ: "g", қ: "q", ҳ: "h",
};

export function transliterate(input: string) {
  return Array.from(input)
    .map((ch) => {
      const mapped = MAP[ch.toLowerCase()];
      return mapped === undefined ? ch : mapped;
    })
    .join("");
}

export function slugify(input: string) {
  const slug = transliterate(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "item";
}

export function uniqueSlug(base: string, taken: string[]) {
  const root = slugify(base);
  if (!taken.includes(root)) return root;
  let n = 2;
  while (taken.includes(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
