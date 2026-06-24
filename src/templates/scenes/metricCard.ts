import { escapeHtml } from '../html.js';
import { cinematicCompositionSceneClass, sceneShell } from '../base.js';
import type { MetricCardScene } from '../../config/schema.js';

export const metricCardCss = `
.df-metric-center {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.df-metric-panel {
  background: var(--df-card);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  box-shadow: 0 6px 24px var(--df-shadow);
  padding: var(--df-s5);
}
.df-metric-title {
  font-size: var(--df-fs-lg);
  font-weight: 700;
  color: var(--df-muted);
  margin-bottom: var(--df-s4);
  opacity: 0;
}
.df-metric-grid { display: flex; gap: var(--df-s5); }
.df-metric-item { flex: 1; min-width: 0; opacity: 0; }
.df-metric-value {
  font-size: clamp(24px, 3.4vw, 32px);
  font-weight: 800;
  letter-spacing: -0.4px;
  font-variant-numeric: tabular-nums;
}
.df-metric-label { color: var(--df-muted); font-size: var(--df-fs-sm); margin-top: var(--df-s1); }
.df-chart { margin-top: var(--df-s5); }
.df-chart svg { width: 100%; height: 120px; }
.df-chart rect { transform: scaleY(0); transform-box: fill-box; transform-origin: center bottom; }
.df-chart-line {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
}
.df-chart-area {
  opacity: 0;
}
.df-chart-labels {
  display: grid;
  margin-top: var(--df-s2);
  color: var(--df-faint);
  font-size: var(--df-fs-xs);
  text-align: center;
  opacity: 0;
}
.df-metric-caption { margin-top: var(--df-s4); color: var(--df-muted); font-size: var(--df-fs-base); opacity: 0; }
.df-frame-terminal .df-metric-panel { background: #161b22; border-color: #262d38; }
`;

const VIEW_W = 100;
const VIEW_H = 48;

export interface ChartSvgSpec {
  kind: 'bar' | 'line' | 'area';
  series: number[];
  labels?: string[];
  color?: string;
}

export function chartSvg(chart: ChartSvgSpec): string {
  const color = chart.color ?? 'var(--df-accent)';
  const max = Math.max(...chart.series, 1e-9);
  if (chart.kind === 'bar') {
    const slot = VIEW_W / chart.series.length;
    const barWidth = slot * 0.66;
    const bars = chart.series
      .map((value, i) => {
        const height = (value / max) * (VIEW_H - 4);
        const x = i * slot + (slot - barWidth) / 2;
        return `<rect data-bar="${i}" x="${x.toFixed(2)}" y="${(VIEW_H - height).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="1.2" fill="${color}"/>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none">${bars}</svg>`;
  }
  const points = chart.series
    .map((value, i) => {
      const x = 3 + (i / (chart.series.length - 1)) * (VIEW_W - 6);
      const y = VIEW_H - 4 - (value / max) * (VIEW_H - 10);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  if (chart.kind === 'area') {
    const firstX = 3;
    const lastX = VIEW_W - 3;
    const baseline = VIEW_H - 3;
    return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none">
      <polygon class="df-chart-area" points="${firstX},${baseline} ${points} ${lastX},${baseline}" fill="${color}" fill-opacity="0.18"/>
      <polyline class="df-chart-line" points="${points}" pathLength="100" stroke="${color}"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none"><polyline class="df-chart-line" points="${points}" pathLength="100" stroke="${color}"/></svg>`;
}

export function metricCardHtml(scene: MetricCardScene, index: number): string {
  const title = scene.title ? `<div class="df-metric-title">${escapeHtml(scene.title)}</div>` : '';
  const metrics = scene.metrics
    .map(
      (metric, k) => `<div class="df-metric-item" data-metric="${k}">
        <div class="df-metric-value">${escapeHtml(metric.prefix ?? '')}0${escapeHtml(metric.suffix ?? '')}</div>
        <div class="df-metric-label">${escapeHtml(metric.label)}</div>
      </div>`,
    )
    .join('\n');
  const labels = scene.chart?.labels
    ? `<div class="df-chart-labels" style="grid-template-columns: repeat(${scene.chart.labels.length}, 1fr);">${scene.chart.labels
        .map((label) => `<span>${escapeHtml(label)}</span>`)
        .join('')}</div>`
    : '';
  const chart = scene.chart ? `<div class="df-chart">${chartSvg(scene.chart)}${labels}</div>` : '';
  const caption = scene.caption ? `<div class="df-metric-caption">${escapeHtml(scene.caption)}</div>` : '';
  return sceneShell(
    index,
    `    <div class="df-metric-center">
      <div class="df-metric-panel">
        ${title}
        <div class="df-metric-grid">
          ${metrics}
        </div>
        ${chart}
        ${caption}
      </div>
    </div>`,
    '',
    cinematicCompositionSceneClass(scene, 'metric-card'),
  );
}
