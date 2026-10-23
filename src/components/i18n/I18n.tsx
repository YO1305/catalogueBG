"use client";

import { createContext, useContext, useMemo } from "react";
import { translate } from "@/lib/i18n";
import type { Lang } from "@/types";

const I18nContext = createContext<{ lang: Lang; setLang?: (lang: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string }>({
  lang: "ru",
  t: (key) => key,
});

export function I18nProvider({ lang, setLang, children }: { lang: Lang; setLang?: (lang: Lang) => void; children: React.ReactNode }) {
  const value = useMemo(
    () => ({ lang, setLang, t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
