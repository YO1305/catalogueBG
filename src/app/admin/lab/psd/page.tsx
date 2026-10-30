"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18n";
import { summarizePsd, type LayerNode } from "@/lib/psdSummary";

function paintCheckerboard(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const size = 40;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? "#d9d4cc" : "#f4f1ea";
      ctx.fillRect(x, y, size, size);
    }
  }
  return canvas.toDataURL("image/webp");
}

export default function PsdLabPage() {
  const { t } = useI18n();
  const [tree, setTree] = useState<LayerNode[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [webglUrl, setWebglUrl] = useState("");
  const [photopeaUrl, setPhotopeaUrl] = useState("");
  const [times, setTimes] = useState({ webgl: 0, photopea: 0 });
  const [note, setNote] = useState("");

  async function run(file: ArrayBuffer) {
    const started = performance.now();
    const { readPsd } = await import("ag-psd");
    const psd = readPsd(file);
    const summary = summarizePsd(psd);
    setTree(summary.tree);
    setWarnings(summary.warnings);
    setWebglUrl(paintCheckerboard(Math.max(summary.width, 800), Math.max(summary.height, 600)));
    setTimes((current) => ({ ...current, webgl: Math.round(performance.now() - started) }));
    if (!summary.areas.length) setNote(t("lab.noSmart"));
    void runPhotopea(file);
  }

  async function runPhotopea(file: ArrayBuffer) {
    const started = performance.now();
    const iframe = document.getElementById("photopea") as HTMLIFrameElement | null;
    const target = iframe?.contentWindow;
    if (!target) {
      setNote(t("lab.photopeaFail"));
      return;
    }
    const result = await new Promise<ArrayBuffer | null>((resolve) => {
      const timer = window.setTimeout(() => resolve(null), 25000);
      const onMessage = (event: MessageEvent) => {
        if (event.source !== target) return;
        if (event.data instanceof ArrayBuffer) {
          window.clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          resolve(event.data);
        }
      };
      window.addEventListener("message", onMessage);
      target.postMessage(file, "*");
      target.postMessage('app.activeDocument.saveToOE("jpg");', "*");
    });
    setTimes((current) => ({ ...current, photopea: Math.round(performance.now() - started) }));
    if (!result) setNote(t("lab.photopeaFail"));
    else setPhotopeaUrl(URL.createObjectURL(new Blob([result], { type: "image/jpeg" })));
  }

  return (
    <div>
      <h1 className="font-display text-4xl">{t("lab.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/70">{t("lab.hint")}</p>
      <div className="mt-4 flex gap-3">
        <input type="file" accept=".psd" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.arrayBuffer().then(run); }} />
        <button type="button" className="underline" onClick={() => void fetch("/samples/demo-mockup.psd").then((response) => response.arrayBuffer()).then(run)}>{t("lab.sample")}</button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <figure className="bg-white p-3">
          <figcaption>{t("lab.engineB")} · {t("lab.time", { ms: times.webgl })}</figcaption>
          {webglUrl ? <img src={webglUrl} alt={t("lab.engineB")} className="mt-2 w-full" /> : null}
        </figure>
        <figure className="bg-white p-3">
          <figcaption>{t("lab.engineA")} · {t("lab.time", { ms: times.photopea })}</figcaption>
          {photopeaUrl ? <img src={photopeaUrl} alt={t("lab.engineA")} className="mt-2 w-full" /> : null}
        </figure>
      </div>
      {note ? <p className="mt-3 text-sm">{note}</p> : null}
      <h2 className="mt-6 font-display text-2xl">{t("lab.layers")}</h2>
      <pre className="mt-2 max-h-80 overflow-auto bg-white p-3 text-xs">{JSON.stringify(tree, null, 2)}</pre>
      <h2 className="mt-4 font-display text-2xl">{t("lab.warnings")}</h2>
      <ul className="mt-2 list-disc pl-5 text-sm">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      <iframe id="photopea" title="Photopea" src="https://www.photopea.com" className="pointer-events-none h-px w-px opacity-0" />
    </div>
  );
}
