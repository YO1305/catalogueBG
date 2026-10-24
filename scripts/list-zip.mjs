import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const zipPath = process.argv[2];
const zip = await JSZip.loadAsync(await readFile(zipPath));
for (const name of Object.keys(zip.files).sort()) {
  if (!zip.files[name].dir) console.log(name);
}
