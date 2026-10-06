#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MODES = new Set(['journal-club', 'lab-meeting']);
const LANGUAGES = new Set(['zh', 'en']);
const STATUSES = new Set(['complete', 'draft']);
const KINDS = new Set([
  'cover', 'statement', 'text', 'chart', 'table', 'diagram',
  'comparison', 'decision', 'sources', 'closing',
]);

export function validateSpec(spec, specPath = '<memory>') {
  const errors = [];
  const warnings = [];
  const required = ['schemaVersion', 'mode', 'language', 'status', 'title', 'durationMinutes', 'slides', 'sources'];

  for (const field of required) {
    if (spec[field] === undefined || spec[field] === null || spec[field] === '') {
      errors.push(`${field} is required`);
    }
  }
  if (spec.schemaVersion !== '1.0') errors.push('schemaVersion must be "1.0"');
  if (!MODES.has(spec.mode)) errors.push('mode must be "journal-club" or "lab-meeting"');
  if (!LANGUAGES.has(spec.language)) errors.push('language must be "zh" or "en"');
  if (!STATUSES.has(spec.status)) errors.push('status must be "complete" or "draft"');
  if (!Number.isFinite(spec.durationMinutes) || spec.durationMinutes <= 0) errors.push('durationMinutes must be positive');
  if (!Array.isArray(spec.slides) || spec.slides.length === 0) errors.push('slides must be a non-empty array');
  if (!Array.isArray(spec.sources)) errors.push('sources must be an array');
  if (spec.status === 'draft' && (!Array.isArray(spec.missingInputs) || spec.missingInputs.length === 0)) {
    errors.push('draft decks must declare at least one missingInputs item');
  }
  if (spec.status === 'complete' && Array.isArray(spec.missingInputs) && spec.missingInputs.length) {
    errors.push('complete decks cannot contain missingInputs');
  }

  const expected = spec.mode === 'journal-club' ? [14, 18] : [10, 14];
  if (Array.isArray(spec.slides) && (spec.slides.length < expected[0] || spec.slides.length > expected[1])) {
    warnings.push(`${spec.mode} normally uses ${expected[0]}–${expected[1]} slides; received ${spec.slides.length}`);
  }

  const sourceIds = new Set();
  for (const [i, source] of (spec.sources || []).entries()) {
    const loc = `sources[${i}]`;
    if (!source.id) errors.push(`${loc}.id is required`);
    if (sourceIds.has(source.id)) errors.push(`${loc}.id must be unique`);
    sourceIds.add(source.id);
    if (!source.title) errors.push(`${loc}.title is required`);
    const hasLocator = source.synthetic || source.url || source.doi || source.usage === 'user-supplied';
    if (!hasLocator) {
      const message = `${loc} needs url, doi, synthetic=true, or usage="user-supplied"`;
      (spec.status === 'draft' ? warnings : errors).push(message);
    }
  }

  for (const [i, slide] of (spec.slides || []).entries()) {
    const loc = `slides[${i}]`;
    if (!KINDS.has(slide.kind)) errors.push(`${loc}.kind is invalid`);
    if (!slide.title && slide.kind !== 'cover') errors.push(`${loc}.title is required`);
    if (typeof slide.title === 'string' && slide.title.length > 64) warnings.push(`${loc}.title is long (${slide.title.length} characters)`);
    if (!Number.isFinite(slide.timeSeconds) || slide.timeSeconds <= 0) errors.push(`${loc}.timeSeconds must be positive`);
    if (!slide.speakerNotes) warnings.push(`${loc}.speakerNotes is empty`);
    for (const id of slide.citations || []) {
      if (!sourceIds.has(id)) errors.push(`${loc}.citations references unknown source "${id}"`);
    }

    if (slide.kind === 'chart') {
      if (!slide.chart || !Array.isArray(slide.chart.categories) || !Array.isArray(slide.chart.series)) {
        errors.push(`${loc}.chart requires categories and series`);
      } else {
        for (const [j, series] of slide.chart.series.entries()) {
          if (!Array.isArray(series.values) || series.values.length !== slide.chart.categories.length) {
            errors.push(`${loc}.chart.series[${j}].values must match category count`);
          }
          if (!series.name) errors.push(`${loc}.chart.series[${j}].name is required`);
        }
        if (!slide.chart.unit) warnings.push(`${loc}.chart.unit is empty`);
        if (slide.chart.synthetic !== true && slide.chart.synthetic !== false) warnings.push(`${loc}.chart.synthetic should be explicit`);
      }
    }
    if (slide.kind === 'table') {
      if (!slide.table || !Array.isArray(slide.table.headers) || !Array.isArray(slide.table.rows)) {
        errors.push(`${loc}.table requires headers and rows`);
      } else {
        if (slide.table.headers.length > 8) warnings.push(`${loc}.table is wide (${slide.table.headers.length} columns)`);
        for (const [j, row] of slide.table.rows.entries()) {
          if (row.length !== slide.table.headers.length) errors.push(`${loc}.table.rows[${j}] width does not match headers`);
        }
      }
    }
    if (slide.image) {
      if (slide.image.explicitPermission !== true) errors.push(`${loc}.image requires explicitPermission=true`);
      for (const field of ['source', 'license', 'riskNote']) {
        if (!slide.image[field]) errors.push(`${loc}.image.${field} is required`);
      }
      if (slide.image.path) {
        const resolved = path.resolve(path.dirname(specPath === '<memory>' ? process.cwd() : specPath), slide.image.path);
        if (!fs.existsSync(resolved)) warnings.push(`${loc}.image.path does not exist; generator will show a placeholder`);
      }
    }
  }

  const timedSeconds = (spec.slides || []).reduce((sum, slide) => sum + (Number(slide.timeSeconds) || 0), 0);
  const targetSeconds = Number(spec.durationMinutes || 0) * 60;
  if (targetSeconds && Math.abs(timedSeconds - targetSeconds) > Math.max(90, targetSeconds * 0.15)) {
    warnings.push(`slide timing totals ${timedSeconds}s but target is ${targetSeconds}s`);
  }

  return { errors, warnings };
}

export function readAndValidate(file) {
  const absolute = path.resolve(file);
  const spec = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  const result = validateSpec(spec, absolute);
  return { absolute, spec, ...result };
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node validate-spec.mjs <spec.json> [...]');
    process.exitCode = 2;
    return;
  }
  let failed = false;
  for (const file of files) {
    const result = readAndValidate(file);
    for (const warning of result.warnings) console.warn(`WARN ${file}: ${warning}`);
    for (const error of result.errors) console.error(`ERROR ${file}: ${error}`);
    if (result.errors.length) failed = true;
    else console.log(`OK ${file}: ${result.spec.slides.length} slides`);
  }
  if (failed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();

