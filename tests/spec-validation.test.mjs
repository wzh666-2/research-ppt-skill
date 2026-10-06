import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec } from '../skills/research-ppt-maker/scripts/validate-spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const journal = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/journal-club.zh.json'), 'utf8'));
const lab = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/lab-meeting.zh.json'), 'utf8'));

test('both original example specifications are valid', () => {
  assert.deepEqual(validateSpec(journal).errors, []);
  assert.deepEqual(validateSpec(lab).errors, []);
});

test('invalid chart lengths are rejected', () => {
  const broken = structuredClone(journal);
  const chart = broken.slides.find((slide) => slide.kind === 'chart');
  chart.chart.series[0].values.pop();
  assert.ok(validateSpec(broken).errors.some((message) => message.includes('category count')));
});

test('draft decks require explicit missing inputs', () => {
  const broken = structuredClone(lab);
  broken.status = 'draft';
  broken.missingInputs = [];
  assert.ok(validateSpec(broken).errors.some((message) => message.includes('missingInputs')));
});

test('external images require permission and complete provenance', () => {
  const broken = structuredClone(journal);
  broken.slides[2].image = { path: 'missing.png', source: '', license: '', riskNote: '', explicitPermission: false };
  const errors = validateSpec(broken).errors.join('\n');
  assert.match(errors, /explicitPermission=true/);
  assert.match(errors, /image\.source/);
  assert.match(errors, /image\.license/);
  assert.match(errors, /image\.riskNote/);
});

test('long titles and wide tables warn without becoming invalid', () => {
  const edge = structuredClone(lab);
  edge.slides[1].title = '超长标题'.repeat(20);
  const table = edge.slides.find((slide) => slide.kind === 'table');
  table.table.headers = Array.from({ length: 9 }, (_, i) => `列${i + 1}`);
  table.table.rows = [Array.from({ length: 9 }, (_, i) => `值${i + 1}`)];
  const result = validateSpec(edge);
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((message) => message.includes('title is long')));
  assert.ok(result.warnings.some((message) => message.includes('table is wide')));
});

test('English is an accepted output language', () => {
  const english = structuredClone(lab);
  english.language = 'en';
  assert.equal(validateSpec(english).errors.length, 0);
});

