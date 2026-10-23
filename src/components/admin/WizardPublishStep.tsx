"use client";

import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { suspectTerms } from "@/lib/glossary";
import type { Fabric, GlossaryTerm } from "@/types";

export function WizardPublishStep({
  fabric,
  glossary,
  checks,
  engine,
  suspects,
  onChange,
  onEngine,
  onSuspects,
  onDraft,
  onPublish,
}: {
  fabric: Fabric;
  glossary: GlossaryTerm[];
  checks: boolean[];
  engine: string;
  suspects: string[];
  onChange: (partial: Partial<Fabric>) => void;
  onEngine: (engine: string) => void;
  onSuspects: (words: string[]) => void;
  onDraft: () => void;
  onPublish: () => void;
}) {
  const { t } = useI18n();
  const labels = [t("wizard.checklistDesign"), t("wizard.checklistRapport"), t("wizard.checklistMockup"), t("wizard.checklistTranslation")];
  return (
    <section className="bg-white p-5">
      <div className="grid gap-4 md:grid-cols-3">
        {(["ru", "en", "uz"] as const).map((lang) => (
          <div key={lang} className="space-y-2">
            <Input value={fabric.name[lang]} onChange={(event) => onChange({ name: { ...fabric.name, [lang]: event.target.value }, translationLocked: { ...fabric.translationLocked, name: lang !== "ru" || fabric.translationLocked.name } })} />
            <Textarea value={fabric.description[lang]} onChange={(event) => onChange({ description: { ...fabric.description, [lang]: event.target.value }, translationLocked: { ...fabric.translationLocked, description: true } })} />
            <Input value={fabric.composition[lang]} onChange={(event) => onChange({ composition: { ...fabric.composition, [lang]: event.target.value }, translationLocked: { ...fabric.translationLocked, composition: true } })} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={async () => {
          const response = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fields: { name: fabric.name.ru, description: fabric.description.ru, composition: fabric.composition.ru }, locked: fabric.translationLocked }) });
          const data = await response.json() as { en: Record<string, string>; uz: Record<string, string>; engine: string };
          onChange({
            name: { ...fabric.name, en: fabric.translationLocked.name ? fabric.name.en : data.en.name || fabric.name.en, uz: fabric.translationLocked.name ? fabric.name.uz : data.uz.name || fabric.name.uz },
            description: { ...fabric.description, en: fabric.translationLocked.description ? fabric.description.en : data.en.description || fabric.description.en, uz: fabric.translationLocked.description ? fabric.description.uz : data.uz.description || fabric.description.uz },
            composition: { ...fabric.composition, en: fabric.translationLocked.composition ? fabric.composition.en : data.en.composition || fabric.composition.en, uz: fabric.translationLocked.composition ? fabric.composition.uz : data.uz.composition || fabric.composition.uz },
          });
          onEngine(data.engine);
        }}>{t("wizard.retranslate")}</Button>
        <Button type="button" variant="outline" onClick={() => onSuspects(suspectTerms(`${fabric.name.ru} ${fabric.description.ru} ${fabric.composition.ru}`, glossary))}>{t("wizard.check")}</Button>
      </div>
      {engine === "fallback" ? <p className="mt-2 text-sm text-ink/60">{t("wizard.fallbackNote")}</p> : null}
      <p className="mt-2 text-sm">{suspects.length ? t("wizard.unknownTerms", { words: suspects.join(", ") }) : t("wizard.checkOk")}</p>
      <ul className="mt-4 space-y-1 text-sm">
        {labels.map((label, index) => <li key={label}>{checks[index] ? "✓" : "·"} {label}</li>)}
      </ul>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onDraft}>{t("wizard.saveDraft")}</Button>
        <Button type="button" disabled={checks.some((ok) => !ok)} onClick={onPublish}>{t("wizard.publishBtn")}</Button>
      </div>
    </section>
  );
}
