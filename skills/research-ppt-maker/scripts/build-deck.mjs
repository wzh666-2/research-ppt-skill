#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import PptxGenJS from 'pptxgenjs';
import { readAndValidate } from './validate-spec.mjs';

const C = {
  canvas: 'F7F3EA', paper: 'FFFCF5', ink: '18313A', teal: '1F7A78',
  amber: 'D79A2B', risk: 'C65F46', slate: '66737A', line: 'D8D4C8', white: 'FFFFFF',
};
const FONT_ZH = 'Microsoft YaHei';
const FONT_EN = 'Aptos';
const W = 13.333;
const H = 7.5;
const M = 0.62;

function fontFor(spec) { return spec.language === 'zh' ? FONT_ZH : FONT_EN; }
function str(value) { return value === undefined || value === null ? '' : String(value); }
function safeArray(value) { return Array.isArray(value) ? value : []; }

function baseSlide(pptx, spec, slideData, index) {
  const slide = pptx.addSlide();
  slide.background = { color: C.canvas };
  const fontFace = fontFor(spec);
  if (slideData.kind !== 'cover') {
    slide.addText(str(slideData.section || (spec.mode === 'journal-club' ? 'JOURNAL CLUB' : 'LAB MEETING')).toUpperCase(), {
      x: M, y: 0.32, w: 4.4, h: 0.22, fontFace, fontSize: 9, bold: true,
      charSpacing: 1.4, color: C.teal, margin: 0, breakLine: false,
    });
    slide.addText(str(slideData.title), {
      x: M, y: 0.68, w: 11.95, h: 0.58, fontFace, fontSize: 25, bold: true,
      color: C.ink, margin: 0, breakLine: false, fit: 'shrink', valign: 'mid',
    });
    if (slideData.takeaway) {
      slide.addText(str(slideData.takeaway), {
        x: M, y: 1.32, w: 11.95, h: 0.42, fontFace, fontSize: 14.5,
        color: C.slate, margin: 0, fit: 'shrink', breakLine: false,
      });
    }
    slide.addShape(pptx.ShapeType.line, {
      x: M, y: 6.98, w: 12.08, h: 0, line: { color: C.line, width: 0.8 },
    });
    slide.addText(`${String(index + 1).padStart(2, '0')}  ·  ${Math.round((slideData.timeSeconds || 0) / 5) * 5}s`, {
      x: 11.35, y: 7.06, w: 1.35, h: 0.18, fontFace, fontSize: 8.5,
      color: C.slate, align: 'right', margin: 0,
    });
  }
  return slide;
}

function addDraftFlag(slide, pptx, spec) {
  if (spec.status !== 'draft') return;
  slide.addText(spec.language === 'zh' ? '草稿 · 含待补充项' : 'DRAFT · MISSING INPUTS', {
    x: 10.2, y: 0.27, w: 2.48, h: 0.28, fontFace: fontFor(spec), fontSize: 9,
    bold: true, color: C.risk, align: 'right', margin: 0,
  });
}

function bodyRuns(items, color = C.ink) {
  return safeArray(items).map((item) => ({
    text: str(item), options: { bullet: { indent: 14 }, hanging: 3, breakLine: true, color },
  }));
}

function addCover(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const mode = spec.mode === 'journal-club'
    ? (spec.language === 'zh' ? '文献汇报' : 'JOURNAL CLUB')
    : (spec.language === 'zh' ? '完整组会汇报' : 'LAB MEETING');
  slide.addText(mode, {
    x: M, y: 0.78, w: 3.2, h: 0.32, fontFace, fontSize: 12, bold: true,
    charSpacing: 1.5, color: C.teal, margin: 0,
  });
  slide.addText(spec.title, {
    x: M, y: 1.55, w: 10.8, h: 1.75, fontFace, fontSize: 31, bold: true,
    color: C.ink, margin: 0, fit: 'shrink', valign: 'mid', breakLine: false,
  });
  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: M, y: 3.56, w: 10.8, h: 0.55, fontFace, fontSize: 16,
      color: C.slate, margin: 0, fit: 'shrink',
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: M, y: 5.22, w: 5.1, h: 0, line: { color: C.amber, width: 3 },
  });
  const meta = [spec.presenter, spec.affiliation, spec.date].filter(Boolean).join('  ·  ');
  slide.addText(meta, {
    x: M, y: 5.5, w: 8.8, h: 0.38, fontFace, fontSize: 12.5,
    color: C.ink, margin: 0,
  });
  slide.addText(`${spec.durationMinutes} min  ·  ${spec.audience || ''}`, {
    x: M, y: 6.42, w: 8.8, h: 0.28, fontFace, fontSize: 10.5,
    color: C.slate, margin: 0,
  });
  if (spec.status === 'draft') addDraftFlag(slide, pptx, spec);
  if (data.takeaway) {
    slide.addText(data.takeaway, {
      x: 9.32, y: 5.18, w: 3.35, h: 1.28, fontFace, fontSize: 13,
      color: C.teal, bold: true, margin: 0.12, valign: 'bottom', fit: 'shrink',
    });
  }
}

function addStatement(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  slide.addText(data.statement || data.takeaway || data.body?.[0] || '', {
    x: 0.95, y: 2.15, w: 11.4, h: 1.75, fontFace, fontSize: 29, bold: true,
    color: C.ink, margin: 0, align: 'left', valign: 'mid', fit: 'shrink',
  });
  const support = safeArray(data.body).slice(data.statement ? 0 : 1);
  if (support.length) {
    slide.addText(bodyRuns(support, C.slate), {
      x: 0.98, y: 4.26, w: 10.7, h: 1.35, fontFace, fontSize: 15.5,
      color: C.slate, margin: 0.04, breakLine: false, valign: 'top',
      paraSpaceAfterPt: 12, bullet: { type: 'bullet' }, fit: 'shrink',
    });
  }
}

function addTextSlide(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const items = safeArray(data.body);
  const split = data.columns && items.length > 3;
  if (split) {
    const mid = Math.ceil(items.length / 2);
    const halves = [items.slice(0, mid), items.slice(mid)];
    halves.forEach((list, i) => {
      slide.addText(bodyRuns(list), {
        x: M + i * 6.05, y: 2.05, w: 5.45, h: 4.45, fontFace, fontSize: 17,
        color: C.ink, margin: 0.04, breakLine: false, paraSpaceAfterPt: 13,
        bullet: { type: 'bullet' }, fit: 'shrink', valign: 'top',
      });
    });
  } else {
    slide.addText(bodyRuns(items), {
      x: 0.92, y: 2.05, w: data.image ? 5.65 : 11.25, h: 4.45, fontFace, fontSize: 18,
      color: C.ink, margin: 0.04, breakLine: false, paraSpaceAfterPt: 15,
      bullet: { type: 'bullet' }, fit: 'shrink', valign: 'top',
    });
  }
}

function addOptionalImage(slide, pptx, spec, data, inputDir) {
  if (!data.image) return;
  const fontFace = fontFor(spec);
  const absolute = data.image.path ? path.resolve(inputDir, data.image.path) : '';
  const box = { x: 7.0, y: 2.02, w: 5.62, h: 3.88 };
  if (absolute && fs.existsSync(absolute)) {
    slide.addImage({
      path: absolute, ...box,
      sizing: { type: 'contain', w: box.w, h: box.h },
      altText: data.image.altText || data.image.source || 'User-requested source figure',
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      ...box, fill: { color: 'F1E7E2' }, line: { color: C.risk, width: 1.2, dash: 'dash' },
    });
    slide.addText(spec.language === 'zh' ? '[待补充图像]' : '[MISSING IMAGE]', {
      ...box, fontFace, fontSize: 17, bold: true, color: C.risk,
      align: 'center', valign: 'mid', margin: 0.1,
    });
  }
  slide.addText(`${data.image.source}\n${data.image.license} · ${data.image.riskNote}`, {
    x: box.x, y: 6.02, w: box.w, h: 0.54, fontFace, fontSize: 8.5,
    color: C.slate, margin: 0, fit: 'shrink', valign: 'top',
  });
}

function chartType(pptx, type) {
  if (type === 'line') return pptx.ChartType.line;
  return pptx.ChartType.bar;
}

function addChartSlide(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const chart = data.chart;
  const chartData = chart.series.map((series) => ({
    name: series.name,
    labels: chart.categories.map(str),
    values: series.values.map(Number),
  }));
  const seriesColors = [C.teal, C.amber, C.risk, '587D8A'];
  slide.addChart(chartType(pptx, chart.type), chartData, {
    x: M, y: 2.0, w: 8.15, h: 4.4,
    catAxisLabelFontFace: fontFace, catAxisLabelFontSize: 10.5,
    valAxisLabelFontFace: fontFace, valAxisLabelFontSize: 10.5,
    showTitle: false, showLegend: chart.series.length > 1,
    legendFontFace: fontFace, legendFontSize: 10, legendPos: 'b',
    showValue: false, showCatName: false, showSerName: false,
    chartColors: seriesColors, showCatName: false,
    showValue: false, valGridLine: { color: C.line, width: 1 },
    catAxisLineColor: C.line, valAxisLineColor: C.line,
    showBorder: false, showMarker: chart.type === 'line',
    markerSize: 6, lineSize: 2.5,
    barDir: chart.type === 'bar' ? 'bar' : 'col',
    showLabel: false,
  });
  slide.addText(chart.unit ? `${spec.language === 'zh' ? '单位' : 'Unit'}: ${chart.unit}` : '', {
    x: M, y: 6.5, w: 3.2, h: 0.22, fontFace, fontSize: 9, color: C.slate, margin: 0,
  });
  const analysis = data.analysis || safeArray(data.body);
  slide.addText(spec.language === 'zh' ? '如何解读' : 'INTERPRETATION', {
    x: 9.15, y: 2.05, w: 2.7, h: 0.28, fontFace, fontSize: 10, bold: true,
    color: C.teal, charSpacing: 1.1, margin: 0,
  });
  slide.addText(bodyRuns(analysis), {
    x: 9.15, y: 2.52, w: 3.48, h: 3.6, fontFace, fontSize: 14.5,
    color: C.ink, margin: 0.03, breakLine: false, paraSpaceAfterPt: 13,
    bullet: { type: 'bullet' }, fit: 'shrink', valign: 'top',
  });
  if (chart.synthetic) {
    slide.addText(spec.language === 'zh' ? '合成示例数据' : 'SYNTHETIC EXAMPLE DATA', {
      x: 9.15, y: 6.18, w: 3.48, h: 0.28, fontFace, fontSize: 9.5, bold: true,
      color: C.amber, margin: 0,
    });
  }
}

function addTableSlide(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const headers = data.table.headers.map((text) => ({
    text: str(text), options: { bold: true, color: C.white, fill: C.teal },
  }));
  const rows = [
    headers,
    ...data.table.rows.map((row, rowIndex) => row.map((text) => ({
      text: str(text), options: { fill: rowIndex % 2 ? 'EFEBDD' : C.paper },
    }))),
  ];
  const colCount = data.table.headers.length;
  const widths = data.table.columnWidths || Array(colCount).fill(11.9 / colCount);
  slide.addTable(rows, {
    x: M, y: 2.02, w: 12.05, h: 4.35, colW: widths,
    fontFace, fontSize: colCount > 6 ? 10.5 : 12.5,
    color: C.ink, border: { type: 'solid', color: C.line, pt: 0.75 },
    fill: C.paper, margin: 0.08, breakLine: false, valign: 'mid',
    autoFit: false, rowH: 0.48,
    bold: false,
  });
}

function addDiagramSlide(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const nodes = safeArray(data.diagram?.nodes);
  const edges = safeArray(data.diagram?.edges);
  const n = Math.max(nodes.length, 1);
  const gap = 0.42;
  const nodeW = Math.min(2.32, (11.8 - gap * (n - 1)) / n);
  const total = nodeW * n + gap * (n - 1);
  const startX = (W - total) / 2;
  const y = 2.55;
  const positions = new Map();
  nodes.forEach((node, i) => {
    const x = startX + i * (nodeW + gap);
    positions.set(node.id, { x, y });
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: nodeW, h: 1.45, rectRadius: 0.05,
      fill: { color: i === nodes.length - 1 ? 'E2EFEA' : C.paper },
      line: { color: i === nodes.length - 1 ? C.teal : C.line, width: 1.2 },
    });
    slide.addText(node.label, {
      x: x + 0.12, y: y + 0.22, w: nodeW - 0.24, h: 0.44,
      fontFace, fontSize: 15, bold: true, color: C.ink, align: 'center', margin: 0, fit: 'shrink',
    });
    slide.addText(node.detail || '', {
      x: x + 0.13, y: y + 0.76, w: nodeW - 0.26, h: 0.43,
      fontFace, fontSize: 10.5, color: C.slate, align: 'center', margin: 0, fit: 'shrink',
    });
  });
  for (const edge of edges) {
    const a = positions.get(edge.from);
    const b = positions.get(edge.to);
    if (!a || !b) continue;
    const x1 = a.x + nodeW;
    const x2 = b.x;
    slide.addShape(pptx.ShapeType.line, {
      x: x1, y: y + 0.72, w: x2 - x1, h: 0,
      line: { color: C.slate, width: 1.5, beginArrowType: 'none', endArrowType: 'triangle' },
    });
    if (edge.label) slide.addText(edge.label, {
      x: x1 - 0.05, y: y + 0.34, w: Math.max(0.4, x2 - x1 + 0.1), h: 0.24,
      fontFace, fontSize: 8.5, color: C.slate, align: 'center', margin: 0, fit: 'shrink',
    });
  }
  if (data.body?.length) {
    slide.addText(bodyRuns(data.body, C.slate), {
      x: 1.05, y: 4.65, w: 11.15, h: 1.25, fontFace, fontSize: 14,
      color: C.slate, margin: 0.03, paraSpaceAfterPt: 10, fit: 'shrink',
    });
  }
}

function addComparison(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const cols = [data.comparison.left, data.comparison.right];
  cols.forEach((col, i) => {
    const x = i === 0 ? M : 6.86;
    const color = i === 0 ? C.teal : C.risk;
    slide.addText(col.title, {
      x, y: 2.02, w: 5.85, h: 0.42, fontFace, fontSize: 17, bold: true,
      color, margin: 0, fit: 'shrink',
    });
    slide.addShape(pptx.ShapeType.line, { x, y: 2.57, w: 5.85, h: 0, line: { color, width: 2.2 } });
    slide.addText(bodyRuns(col.items), {
      x, y: 2.88, w: 5.78, h: 3.45, fontFace, fontSize: 16,
      color: C.ink, margin: 0.03, paraSpaceAfterPt: 14, fit: 'shrink',
    });
  });
}

function addDecision(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  const decision = data.decision;
  slide.addText(decision.question, {
    x: 0.92, y: 2.0, w: 11.45, h: 0.9, fontFace, fontSize: 22, bold: true,
    color: C.ink, margin: 0, fit: 'shrink', valign: 'mid',
  });
  slide.addText(bodyRuns(decision.options), {
    x: 1.02, y: 3.12, w: 7.2, h: 2.55, fontFace, fontSize: 16,
    color: C.ink, margin: 0.03, paraSpaceAfterPt: 14, fit: 'shrink',
  });
  slide.addText(spec.language === 'zh' ? '建议' : 'RECOMMENDATION', {
    x: 9.0, y: 3.12, w: 2.8, h: 0.28, fontFace, fontSize: 10, bold: true,
    color: C.amber, charSpacing: 1.1, margin: 0,
  });
  slide.addText(decision.recommendation, {
    x: 9.0, y: 3.62, w: 3.42, h: 1.55, fontFace, fontSize: 15.5,
    bold: true, color: C.ink, margin: 0, fit: 'shrink', valign: 'mid',
  });
}

function addSources(slide, pptx, spec) {
  const fontFace = fontFor(spec);
  const rows = spec.sources.map((source, i) => {
    const locator = source.doi ? `doi:${source.doi}` : (source.url || (source.synthetic ? 'synthetic example' : source.usage || ''));
    return [source.id, source.title, locator, source.license || (source.synthetic ? 'CC BY 4.0' : 'unknown')];
  });
  const sourceHeaders = [spec.language === 'zh' ? '编号' : 'ID', spec.language === 'zh' ? '来源' : 'Source', spec.language === 'zh' ? '定位' : 'Locator', spec.language === 'zh' ? '许可/状态' : 'License/status']
    .map((text) => ({ text, options: { bold: true, color: C.white, fill: C.teal } }));
  const sourceRows = rows.map((row, rowIndex) => row.map((text) => ({
    text, options: { fill: rowIndex % 2 ? 'EFEBDD' : C.paper },
  })));
  slide.addTable([sourceHeaders, ...sourceRows], {
    x: M, y: 1.95, w: 12.05, h: 4.45, colW: [1.0, 5.15, 3.75, 2.15],
    fontFace, fontSize: 10.5, color: C.ink, border: { color: C.line, pt: 0.7 },
    fill: C.paper, margin: 0.07, autoFit: false, rowH: 0.42, breakLine: false,
  });
  if (spec.missingInputs?.length) {
    slide.addText(`${spec.language === 'zh' ? '待补充' : 'MISSING'}: ${spec.missingInputs.join('；')}`, {
      x: M, y: 6.48, w: 11.9, h: 0.28, fontFace, fontSize: 10, color: C.risk, margin: 0, fit: 'shrink',
    });
  }
}

function addClosing(slide, pptx, spec, data) {
  const fontFace = fontFor(spec);
  slide.addText(data.closing || (spec.language === 'zh' ? '讨论与提问' : 'Discussion'), {
    x: 0.92, y: 2.3, w: 11.3, h: 1.05, fontFace, fontSize: 34, bold: true,
    color: C.ink, margin: 0, fit: 'shrink', align: 'left', valign: 'mid',
  });
  if (data.body?.length) {
    slide.addText(bodyRuns(data.body, C.slate), {
      x: 0.98, y: 3.7, w: 10.6, h: 1.75, fontFace, fontSize: 17,
      color: C.slate, margin: 0.03, paraSpaceAfterPt: 13, fit: 'shrink',
    });
  }
  slide.addText(spec.presenter || '', {
    x: 0.92, y: 6.48, w: 5.2, h: 0.28, fontFace, fontSize: 10.5,
    color: C.teal, margin: 0,
  });
}

function citationsText(spec, ids) {
  const byId = new Map(spec.sources.map((source) => [source.id, source]));
  return safeArray(ids).map((id) => {
    const source = byId.get(id);
    if (!source) return id;
    return `${id}: ${source.title}${source.doi ? ` · doi:${source.doi}` : ''}${source.url ? ` · ${source.url}` : ''}`;
  }).join('\n');
}

function addNotes(slide, spec, data) {
  const notes = [
    `TIME: ${data.timeSeconds}s`,
    `TAKEAWAY: ${data.takeaway || data.statement || ''}`,
    '',
    data.speakerNotes || '',
  ];
  const citations = citationsText(spec, data.citations);
  if (citations) notes.push('', 'CITATIONS:', citations);
  slide.addNotes(notes.join('\n'));
}

export async function buildDeck(inputFile, outputFile) {
  const validated = readAndValidate(inputFile);
  if (validated.errors.length) throw new Error(`Invalid deck spec:\n${validated.errors.join('\n')}`);
  const spec = validated.spec;
  const inputDir = path.dirname(path.resolve(inputFile));
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'wzh666-2';
  pptx.company = spec.affiliation || '';
  pptx.subject = spec.mode === 'journal-club' ? 'Journal club presentation' : 'Lab meeting presentation';
  pptx.title = spec.title;
  pptx.lang = spec.language === 'zh' ? 'zh-CN' : 'en-US';
  pptx.theme = {
    headFontFace: fontFor(spec), bodyFontFace: fontFor(spec), lang: pptx.lang,
  };
  pptx.defineSlideMaster({
    title: 'RESEARCH_CANVAS',
    background: { color: C.canvas },
    objects: [],
    slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.2, color: C.slate, fontFace: fontFor(spec), fontSize: 8 },
  });

  spec.slides.forEach((data, index) => {
    const slide = baseSlide(pptx, spec, data, index);
    addDraftFlag(slide, pptx, spec);
    switch (data.kind) {
      case 'cover': addCover(slide, pptx, spec, data); break;
      case 'statement': addStatement(slide, pptx, spec, data); break;
      case 'text': addTextSlide(slide, pptx, spec, data); break;
      case 'chart': addChartSlide(slide, pptx, spec, data); break;
      case 'table': addTableSlide(slide, pptx, spec, data); break;
      case 'diagram': addDiagramSlide(slide, pptx, spec, data); break;
      case 'comparison': addComparison(slide, pptx, spec, data); break;
      case 'decision': addDecision(slide, pptx, spec, data); break;
      case 'sources': addSources(slide, pptx, spec); break;
      case 'closing': addClosing(slide, pptx, spec, data); break;
      default: addTextSlide(slide, pptx, spec, data);
    }
    addOptionalImage(slide, pptx, spec, data, inputDir);
    addNotes(slide, spec, data);
  });

  const absoluteOutput = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  await pptx.writeFile({ fileName: absoluteOutput, compression: true });
  return { output: absoluteOutput, slides: spec.slides.length, warnings: validated.warnings };
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node build-deck.mjs <input.json> <output.pptx>');
    process.exitCode = 2;
    return;
  }
  try {
    const result = await buildDeck(input, output);
    for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
    console.log(`Built ${result.slides} slides: ${result.output}`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
