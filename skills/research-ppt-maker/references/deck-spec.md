# Deck specification

The generator consumes UTF-8 JSON. Required top-level fields:

```json
{
  "schemaVersion": "1.0",
  "mode": "journal-club",
  "language": "zh",
  "status": "complete",
  "title": "Deck title",
  "subtitle": "Optional subtitle",
  "presenter": "Name",
  "affiliation": "Lab",
  "date": "2026-09-28",
  "audience": "Computational engineering group",
  "durationMinutes": 20,
  "missingInputs": [],
  "slides": [],
  "sources": []
}
```

`mode` is `journal-club` or `lab-meeting`; `language` is `zh` or `en`;
`status` is `complete` or `draft`.

Each slide accepts:

- `kind`: `cover`, `statement`, `text`, `chart`, `table`, `diagram`,
  `comparison`, `decision`, `sources`, or `closing`.
- `title`, `takeaway`, `section`, `body[]`, `timeSeconds`, `speakerNotes`.
- `chart`: `{ "type": "bar|column|line", "categories": [], "series":
  [{"name":"…","values":[]}], "unit":"…", "synthetic": true }`.
- `table`: `{ "headers": [], "rows": [[]], "columnWidths": [] }`.
- `diagram`: `{ "nodes": [{"id":"…","label":"…","detail":"…"}],
  "edges": [{"from":"…","to":"…","label":"…"}] }`.
- `comparison`: `{ "left": {"title":"…","items":[]}, "right": {...} }`.
- `decision`: `{ "question":"…", "options":[], "recommendation":"…" }`.
- `citations`: array of source IDs from the top-level `sources`.
- `image`: optional `{ "path":"…", "source":"…", "license":"…",
  "riskNote":"…", "explicitPermission":true }`.

Source entries accept `id`, `title`, `authors`, `year`, `url`, `doi`, `license`,
`usage`, and `synthetic`. Incomplete citations are allowed only in a draft and
must be listed in `missingInputs`.

Recommended commands:

```bash
node skills/research-ppt-maker/scripts/validate-spec.mjs input.json
node skills/research-ppt-maker/scripts/build-deck.mjs input.json output.pptx
```

