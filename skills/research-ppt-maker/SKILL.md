---
name: research-ppt-maker
description: "Create an original, editable 16:9 research PPTX with speaker notes, citations, and source tracking. Use for Chinese or English 文献汇报, 论文汇报, journal club, 组会汇报, lab meeting, research progress, computational engineering presentations, or when turning a paper PDF/DOI/URL/notes/project materials/results into slides. Supports two commands: 文献汇报 and 组会汇报."
---

# Research PPT Maker

Create an evidence-led research deck without copying a third-party template.

## Select the mode

- `文献汇报`: read `references/journal-club.md`.
- `组会汇报`: read `references/lab-meeting.md`.
- If the mode is omitted, infer it from the request; ask only when both modes
  are equally plausible.

For either mode, also read:

- `references/deck-spec.md` for the JSON contract and command syntax.
- `references/design-system.md` for the original visual system.
- `references/copyright-policy.md` before using any external figure or asset.

## Workflow

1. Inventory the supplied sources. Separate reported facts, user claims,
   inferred interpretation, and missing inputs.
2. Extract a single conclusion for each slide. Build a narrative outline before
   choosing layouts.
3. When evidence is missing, set `status` to `draft`, populate `missingInputs`,
   and add visible `[待补充]` / `[MISSING]` labels. Never fabricate values,
   methods, citations, or results.
4. Prefer editable redraws: native charts, tables, process diagrams, algorithm
   blocks, and status boards. Do not embed a paper figure unless the user
   explicitly asks and the source/license/risk fields are recorded.
5. Write the intermediate JSON in the schema described by
   `references/deck-spec.md`. Resolve this Skill's own directory. On first use,
   or when `node_modules` is absent, install its locked runtime dependencies:

   ```bash
   npm ci --prefix <skill-directory>
   ```

   Then validate and build with absolute or correctly resolved paths:

   ```bash
   node <skill-directory>/scripts/validate-spec.mjs input.json
   node <skill-directory>/scripts/build-deck.mjs input.json output.pptx
   ```

   Once dependencies are installed, validation and generation require no
   network access.

6. Render every slide and inspect every rendered image for overflow, overlap,
   font substitution, contrast, alignment, and visual consistency. Verify the
   PPTX opens, edits, and presents in PowerPoint; check LibreOffice when
   available.
7. Deliver the editable PPTX plus the source JSON. The deck itself contains
   speaker notes, citations, a source register, and per-slide time guidance.

## Invocation examples

```text
$research-ppt-maker 文献汇报：基于 paper.pdf，中文，20 分钟，面向计算力学组会。
$research-ppt-maker 组会汇报：基于 results/ 与 progress.md，中文，15 分钟，突出需要导师决策的问题。
```

Default to Chinese and a technical research audience. Switch to English only
when requested or when the supplied working language is clearly English.
