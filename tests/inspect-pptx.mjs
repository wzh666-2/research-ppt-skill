#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';

export async function inspectPptx(file) {
  const buffer = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  const slideNames = names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const noteNames = names.filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name));
  if (!slideNames.length) throw new Error(`${file}: no slides`);
  if (noteNames.length !== slideNames.length) throw new Error(`${file}: notes ${noteNames.length} != slides ${slideNames.length}`);
  if (!names.some((name) => /^ppt\/charts\/chart\d+\.xml$/.test(name))) throw new Error(`${file}: no editable chart parts`);
  if (!names.includes('ppt/presentation.xml')) throw new Error(`${file}: missing presentation.xml`);
  const textFiles = names.filter((name) => name.endsWith('.xml') || name.endsWith('.rels'));
  const combined = (await Promise.all(textFiles.map((name) => zip.files[name].async('string')))).join('\n').toLowerCase();
  if (combined.includes('scidraw')) throw new Error(`${file}: forbidden reference-template marker found`);
  if (!combined.includes('synthetic') && !combined.includes('合成')) throw new Error(`${file}: synthetic provenance label missing`);
  return { file: path.resolve(file), slides: slideNames.length, notes: noteNames.length };
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node inspect-pptx.mjs <deck.pptx> [...]');
    process.exitCode = 2;
    return;
  }
  for (const file of files) {
    const result = await inspectPptx(file);
    console.log(`OK ${file}: ${result.slides} slides, ${result.notes} notes pages`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
