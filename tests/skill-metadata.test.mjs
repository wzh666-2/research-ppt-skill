import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('SKILL.md and openai.yaml contain required metadata', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills/research-ppt-maker/SKILL.md'), 'utf8');
  const yaml = fs.readFileSync(path.join(ROOT, 'skills/research-ppt-maker/agents/openai.yaml'), 'utf8');
  assert.match(skill, /^---\r?\nname: research-ppt-maker\r?\n/);
  assert.match(skill, /description:/);
  assert.match(yaml, /display_name: "Research PPT Maker"/);
  assert.match(yaml, /\$research-ppt-maker/);
  assert.match(yaml, /allow_implicit_invocation: true/);
  const runtime = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills/research-ppt-maker/package.json'), 'utf8'));
  assert.equal(runtime.dependencies.pptxgenjs, '4.0.1');
  assert.equal(runtime.overrides['image-size'], '2.0.4');
});

test('repository never tracks private SciDraw references', () => {
  const ignored = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.match(ignored, /scidraw-\*\.pptx/);
  const forbidden = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/scidraw/i.test(entry.name)) forbidden.push(full);
    }
  };
  walk(ROOT);
  assert.deepEqual(forbidden, []);
});
