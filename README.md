# Research PPT Skill / 原创科研汇报 PPT Skill

[English](#english) · [中文](#中文)

## 中文

`$research-ppt-maker` 是一个面向工科与计算研究的 Codex Skill。它把论文、阅读笔记、项目进展和结果数据整理为可编辑的 16:9 PPTX，并保留讲稿备注、引用清单、素材来源和每页时间建议。

![文献汇报预览](https://github.com/wzh666-2/research-ppt-skill/releases/download/v0.1.0/journal-club-preview.png)

![组会汇报预览](https://github.com/wzh666-2/research-ppt-skill/releases/download/v0.1.0/lab-meeting-preview.png)

它包含两个指令：

- `$research-ppt-maker 文献汇报`：默认 14–18 页，覆盖研究问题、缺口、方法、实验、关键结果、稳健性、局限、启示和讨论。
- `$research-ppt-maker 组会汇报`：默认 10–14 页，覆盖背景目标、上次计划、本期工作、方法变化、结果、异常诊断、决策和下一步。

### 安装

在 Codex 中安装仓库内的 Skill：

```text
$skill-installer install https://github.com/wzh666-2/research-ppt-skill/tree/main/skills/research-ppt-maker
```

也可以克隆仓库后，将 `skills/research-ppt-maker` 复制到个人 Skill 目录。

### 调用

```text
$research-ppt-maker 文献汇报：基于 paper.pdf，中文，20 分钟，面向计算力学组会。
$research-ppt-maker 组会汇报：基于 results/ 和 progress.md，中文，15 分钟，突出需要导师决策的问题。
```

若只有结构化材料，可直接构建：

```bash
npm ci
npm run validate:specs
npm run build:examples
node skills/research-ppt-maker/scripts/build-deck.mjs input.json output.pptx
```

`v0.1.0` Release 提供可直接下载的 Skill ZIP、两套示例 PPTX 和封面预览图；仓库中的 JSON 示例用于确定性重建这些产物。

### 输入与输出

统一 JSON 中间格式记录模式、语言、时长、受众、逐页结论、正文、图表、引用、素材来源和讲稿。完整字段见 [`deck-spec.md`](skills/research-ppt-maker/references/deck-spec.md)。

生成结果为可编辑 PPTX：文字、形状、图表和表格均为 Office 原生对象。缺少全文或关键数据时，验证器要求使用 `draft` 状态并保留明确的 `[待补充]` 标记；生成器不会编造内容。

### 原创性与版权

视觉系统、代码与两个合成示例均为独立创作。私人参考演示稿不会进入仓库或产物；论文原图默认不嵌入，优先按已引用数值重绘。详见 [`ORIGINALITY.md`](ORIGINALITY.md)。

代码采用 MIT License；原创示例、预览与视觉资产采用 CC BY 4.0，署名 `wzh666-2`。这套来源追踪与检查机制用于降低风险，不构成绝对法律保证。

## English

`$research-ppt-maker` is a Codex Skill for engineering and computational research. It turns papers, notes, project updates, and results into editable 16:9 PPTX decks with speaker notes, citations, provenance, and slide-level timing.

Two modes are included:

- `$research-ppt-maker 文献汇报` — a 14–18 slide journal-club deck.
- `$research-ppt-maker 组会汇报` — a 10–14 slide full project lab meeting.

The default language is Chinese; English is supported through `language: "en"`. See the [deck specification](skills/research-ppt-maker/references/deck-spec.md), [design system](skills/research-ppt-maker/references/design-system.md), and [originality policy](ORIGINALITY.md).

The `v0.1.0` release provides an installable Skill ZIP, two generated example decks, and preview images. All are generated from fictional data and licensed CC BY 4.0.



### Repository map

```text
skills/research-ppt-maker/  Codex Skill, references, and generator
examples/                   two fully synthetic input specs and outputs
tests/                      schema, edge-case, and PPTX package checks
.github/workflows/          reproducible CI build and validation
```

### Development

```bash
npm ci
npm run ci
```

The CI validates metadata and specs, runs edge-case tests, builds both example decks, and inspects the resulting Office Open XML packages.
