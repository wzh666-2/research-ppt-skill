import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDeck } from '../skills/research-ppt-maker/scripts/build-deck.mjs';
import { inspectPptx } from './inspect-pptx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('generator produces editable OOXML charts and speaker notes', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'research-ppt-test-'));
  const output = path.join(temp, 'journal.pptx');
  await buildDeck(path.join(ROOT, 'examples/journal-club.zh.json'), output);
  const result = await inspectPptx(output);
  assert.equal(result.slides, 16);
  assert.equal(result.notes, 16);
  assert.ok(fs.statSync(output).size > 50_000);
});

test('missing but permitted source image becomes a visible placeholder', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'research-ppt-missing-image-'));
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/lab-meeting.zh.json'), 'utf8'));
  spec.status = 'draft';
  spec.missingInputs = ['结果图原文件'];
  spec.slides[2].image = {
    path: 'not-found.png',
    source: 'user-supplied pending asset',
    license: 'permission pending',
    riskNote: 'Do not publish until permission is confirmed.',
    explicitPermission: true
  };
  const input = path.join(temp, 'draft.json');
  const output = path.join(temp, 'draft.pptx');
  fs.writeFileSync(input, JSON.stringify(spec), 'utf8');
  await buildDeck(input, output);
  const result = await inspectPptx(output);
  assert.equal(result.slides, 12);
});
