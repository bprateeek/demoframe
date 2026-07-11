import { normalizeTermLines, type Frame, type MetricValue, type Scene, type ScreenBlock, type ShotObject } from '../config/schema.js';

export type SceneTextLeafKind = 'text' | 'metric-value' | 'callout-value';

export interface SceneTextLeaf {
  path: string;
  text: string;
  kind: SceneTextLeafKind;
  durable: boolean;
}

function pushText(
  out: SceneTextLeaf[],
  path: string,
  text: string | undefined,
  kind: SceneTextLeafKind = 'text',
  durable = true,
): void {
  if (typeof text !== 'string' || text.trim().length === 0) return;
  out.push({ path, text, kind, durable });
}

export function formatMetricValue(value: MetricValue): string {
  const fixed = Math.abs(value.value).toFixed(value.decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const signed = `${value.value < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
  return `${value.prefix ?? ''}${signed}${value.suffix ?? ''}`;
}

function screenBlockTextLeaves(block: ScreenBlock, blockIndex: number): SceneTextLeaf[] {
  const out: SceneTextLeaf[] = [];
  const base = `blocks[${blockIndex}]`;

  switch (block.block) {
    case 'app-header':
      pushText(out, `${base}.title`, block.title);
      pushText(out, `${base}.subtitle`, block.subtitle);
      break;
    case 'stat-strip':
      block.tiles.forEach((tile, index) => {
        pushText(out, `${base}.tiles[${index}].value`, formatMetricValue(tile.value), 'metric-value');
        pushText(out, `${base}.tiles[${index}].label`, tile.label);
        if (tile.delta) {
          const sign = tile.delta.dir === 'up' ? '+' : '-';
          pushText(out, `${base}.tiles[${index}].delta`, `${sign}${Math.abs(tile.delta.value)}`, 'metric-value');
        }
      });
      break;
    case 'chart-card':
      pushText(out, `${base}.title`, block.title);
      block.chart.labels?.forEach((label, index) => pushText(out, `${base}.chart.labels[${index}]`, label));
      break;
    case 'card-grid':
      block.cards.forEach((card, index) => {
        pushText(out, `${base}.cards[${index}].title`, card.title);
        pushText(out, `${base}.cards[${index}].value`, card.value);
        pushText(out, `${base}.cards[${index}].desc`, card.desc);
        pushText(out, `${base}.cards[${index}].badge`, typeof card.badge === 'string' ? card.badge : card.badge?.text);
      });
      break;
    case 'hero-object':
      pushText(out, `${base}.title`, block.title);
      pushText(out, `${base}.subtitle`, block.subtitle);
      pushText(out, `${base}.badge`, typeof block.badge === 'string' ? block.badge : block.badge?.text);
      break;
    case 'list':
      block.rows.forEach((row, index) => {
        pushText(out, `${base}.rows[${index}].avatar.initials`, row.avatar?.initials);
        pushText(out, `${base}.rows[${index}].label`, row.label);
        pushText(out, `${base}.rows[${index}].trailing`, row.trailing);
      });
      break;
    case 'progress':
      block.items.forEach((item, index) => {
        pushText(out, `${base}.items[${index}].label`, item.label);
        pushText(out, `${base}.items[${index}].value`, `${Math.round(item.value)}%`, 'metric-value');
      });
      break;
    case 'heatmap':
      break;
    case 'callout':
      if (block.variant === 'hero-stat') {
        if (block.value) pushText(out, `${base}.value`, formatMetricValue(block.value), 'callout-value');
        pushText(out, `${base}.label`, block.label);
      } else {
        pushText(out, `${base}.text`, block.text);
      }
      break;
  }

  return out;
}

export function sceneTextLeaves(scene: Scene, resolvedFrame?: Frame): SceneTextLeaf[] {
  const out: SceneTextLeaf[] = [];

  if (resolvedFrame) {
    switch (resolvedFrame.type) {
      case 'phone':
        pushText(out, 'frame.title', resolvedFrame.title);
        pushText(out, 'frame.subtitle', resolvedFrame.subtitle);
        break;
      case 'browser':
        pushText(out, 'frame.title', resolvedFrame.title);
        pushText(out, 'frame.url', resolvedFrame.url);
        break;
      case 'terminal':
        pushText(out, 'frame.title', resolvedFrame.title);
        break;
      case 'desktop':
        pushText(out, 'frame.title', resolvedFrame.title);
        pushText(out, 'frame.subtitle', resolvedFrame.subtitle);
        break;
      case 'none':
        break;
    }
  }

  switch (scene.type) {
    case 'typing':
      pushText(out, 'text', scene.text);
      pushText(out, 'placeholder', scene.placeholder, 'text', false);
      break;
    case 'steps':
      pushText(out, 'header.title', scene.header?.title);
      pushText(out, 'header.detail', scene.header?.detail);
      scene.items.forEach((item, index) => {
        pushText(out, `items[${index}].label`, item.label);
        pushText(out, `items[${index}].detail`, item.detail);
      });
      break;
    case 'status-card':
      pushText(out, 'title', scene.title);
      pushText(out, 'subtitle', scene.subtitle);
      pushText(out, 'branch.from', scene.branch?.from);
      pushText(out, 'branch.into', scene.branch?.into);
      scene.checks.forEach((check, index) => pushText(out, `checks[${index}]`, check));
      pushText(out, 'cta.label', scene.cta?.label);
      pushText(out, 'caption', scene.caption);
      break;
    case 'screenshot':
      pushText(out, 'caption', scene.caption);
      break;
    case 'terminal-playback':
      pushText(out, 'command', scene.command);
      normalizeTermLines(scene.output).forEach((line, index) => pushText(out, `output[${index}]`, line.text));
      pushText(out, 'spinner', scene.spinner, 'text', false);
      pushText(out, 'exit.label', scene.exit?.label);
      pushText(out, 'prompt', scene.prompt);
      break;
    case 'code':
      pushText(out, 'title', scene.title);
      pushText(out, 'code', scene.code);
      break;
    case 'chat':
      scene.messages.forEach((message, index) => pushText(out, `messages[${index}].text`, message.text));
      break;
    case 'metric-card':
      pushText(out, 'title', scene.title);
      scene.metrics.forEach((metric, index) => {
        pushText(out, `metrics[${index}].value`, formatMetricValue(metric), 'metric-value');
        pushText(out, `metrics[${index}].label`, metric.label);
      });
      scene.chart?.labels?.forEach((label, index) => pushText(out, `chart.labels[${index}]`, label));
      pushText(out, 'caption', scene.caption);
      break;
    case 'screen':
      scene.blocks.forEach((block, index) => out.push(...screenBlockTextLeaves(block, index)));
      break;
    case 'hold':
      break;
  }

  return out;
}

export function shotObjectTextLeaves(object: ShotObject, resolvedFrame?: Frame): SceneTextLeaf[] {
  if (object.kind === 'scene') return sceneTextLeaves(object.scene, resolvedFrame);
  const out: SceneTextLeaf[] = [];
  switch (object.kind) {
    case 'kinetic-text':
      pushText(out, 'eyebrow', object.eyebrow);
      pushText(out, 'text', object.text);
      break;
    case 'logo-lockup':
      pushText(out, 'product', object.product);
      pushText(out, 'tagline', object.tagline);
      break;
    case 'product-surface':
      pushText(out, 'title', object.title);
      pushText(out, 'subtitle', object.subtitle);
      object.rows.forEach((row, index) => {
        pushText(out, `rows[${index}].label`, row.label);
        pushText(out, `rows[${index}].value`, row.value);
      });
      break;
    case 'hero-metric':
      pushText(out, 'metric', formatMetricValue(object.metric), 'metric-value');
      pushText(out, 'label', object.label);
      pushText(out, 'detail', object.detail);
      break;
    case 'chart-path':
      pushText(out, 'title', object.title);
      object.labels?.forEach((label, index) => pushText(out, `labels[${index}]`, label));
      break;
    case 'image':
      break;
  }
  return out;
}
