import { escapeHtml } from '../html.js';
import { icons } from '../icons.js';
import { chartSvg } from '../scenes/metricCard.js';
import type { MetricValue, ScreenBlock } from '../../config/schema.js';

export const blockCss = `
.df-screen-block {
  background: var(--df-card);
  border: 1px solid var(--df-border);
  border-radius: var(--df-radius);
  box-shadow: 0 6px 22px var(--df-shadow);
  padding: var(--df-s4);
  opacity: 0;
  transform: translateY(12px);
}
.df-screen-app-header {
  display: flex;
  align-items: center;
  gap: var(--df-s3);
  box-shadow: none;
  background: transparent;
  border-color: transparent;
  padding: 0 var(--df-s1);
}
.df-screen-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--df-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--df-accent);
  flex: 0 0 auto;
}
.df-screen-icon svg { width: 19px; height: 19px; }
.df-screen-header-text { min-width: 0; }
.df-screen-title {
  font-size: var(--df-fs-xl);
  font-weight: 800;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-screen-subtitle {
  margin-top: var(--df-s1);
  color: var(--df-muted);
  font-size: var(--df-fs-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.df-stat-strip {
  display: grid;
  gap: var(--df-s3);
}
.df-stat-tile {
  min-width: 0;
  padding: var(--df-s3);
  border-radius: var(--df-radius-sm);
  background: var(--df-screen);
  border: 1px solid var(--df-border);
}
.df-stat-value,
.df-callout-value {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.df-stat-label,
.df-callout-label {
  margin-top: var(--df-s2);
  color: var(--df-muted);
  font-size: var(--df-fs-sm);
}
.df-stat-delta {
  display: inline-flex;
  margin-top: var(--df-s2);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: var(--df-fs-xs);
  font-weight: 700;
}
.df-stat-delta-up { color: var(--df-success); background: var(--df-success-bg); }
.df-stat-delta-down { color: #d1242f; background: rgba(209, 36, 47, 0.1); }
.df-chart-card-title { font-size: var(--df-fs-lg); font-weight: 800; margin-bottom: var(--df-s3); }
.df-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--df-s3);
}
.df-grid-card {
  min-width: 0;
  border: 1px solid var(--df-border);
  background: var(--df-screen);
  border-radius: var(--df-radius-sm);
  padding: var(--df-s3);
}
.df-grid-card-top { display: flex; align-items: center; justify-content: space-between; gap: var(--df-s2); }
.df-grid-card-heading { display: flex; align-items: center; gap: var(--df-s2); min-width: 0; }
.df-grid-card .df-screen-icon { width: 26px; height: 26px; border-radius: 8px; }
.df-grid-card .df-screen-icon svg { width: 15px; height: 15px; }
.df-grid-card-title { font-weight: 800; font-size: var(--df-fs-base); overflow-wrap: anywhere; }
.df-grid-card-value { margin-top: var(--df-s2); font-weight: 800; font-size: var(--df-fs-xl); }
.df-grid-card-desc { margin-top: var(--df-s2); color: var(--df-muted); font-size: var(--df-fs-sm); }
.df-grid-badge {
  flex: 0 0 auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--df-accent) 12%, var(--df-card));
  color: var(--df-accent);
  padding: 3px 8px;
  font-size: var(--df-fs-xs);
  font-weight: 800;
}
.df-screen-list { display: flex; flex-direction: column; gap: var(--df-s2); }
.df-screen-row {
  display: flex;
  align-items: center;
  gap: var(--df-s3);
  min-height: 34px;
}
.df-row-main { min-width: 0; flex: 1; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.df-row-trailing { color: var(--df-muted); font-size: var(--df-fs-sm); flex: 0 0 auto; }
.df-row-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--df-accent);
  font-size: var(--df-fs-xs);
  font-weight: 800;
  flex: 0 0 auto;
}
.df-progress-list { display: flex; flex-direction: column; gap: var(--df-s3); }
.df-progress-top { display: flex; justify-content: space-between; gap: var(--df-s3); font-size: var(--df-fs-sm); font-weight: 700; }
.df-progress-value { color: var(--df-muted); font-variant-numeric: tabular-nums; }
.df-progress-track { margin-top: var(--df-s2); height: 8px; border-radius: 999px; background: var(--df-screen); overflow: hidden; }
.df-progress-bar { width: 100%; height: 100%; border-radius: inherit; background: var(--df-accent); transform: scaleX(0); transform-origin: left center; }
.df-heatmap-grid { display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; gap: 4px; }
.df-heat-cell {
  aspect-ratio: 1;
  width: 14px;
  border-radius: 3px;
  background: var(--df-border);
}
.df-heat-0 { opacity: 0.35; }
.df-heat-1 { background: color-mix(in srgb, var(--df-accent) 28%, var(--df-card)); }
.df-heat-2 { background: color-mix(in srgb, var(--df-accent) 48%, var(--df-card)); }
.df-heat-3 { background: color-mix(in srgb, var(--df-accent) 70%, var(--df-card)); }
.df-heat-4 { background: var(--df-accent); }
.df-screen-callout {
  background: color-mix(in srgb, var(--df-accent) 10%, var(--df-card));
  border-color: color-mix(in srgb, var(--df-accent) 24%, var(--df-border));
  width: min(100%, 460px);
  align-self: center;
}
.df-callout-text { color: var(--df-text); font-size: var(--df-fs-lg); font-weight: 750; line-height: 1.35; }
`;

function iconHtml(key: string | undefined): string {
  if (!key) return '';
  const map = {
    check: icons.check,
    code: icons.code,
    share: icons.share,
    paperclip: icons.paperclip,
    mic: icons.mic,
    'arrow-up': icons.arrowUp,
    spark: icons.spark,
    user: icons.user,
    bolt: icons.bolt,
  } as const;
  return `<span class="df-screen-icon">${map[key as keyof typeof map]}</span>`;
}

function counterHtml(value: MetricValue, className: string): string {
  return `<span class="${className} df-screen-counter" data-value="${value.value}" data-prefix="${escapeHtml(value.prefix ?? '')}" data-suffix="${escapeHtml(value.suffix ?? '')}" data-decimals="${value.decimals}">${escapeHtml(value.prefix ?? '')}0${escapeHtml(value.suffix ?? '')}</span>`;
}

function chartLabels(block: Extract<ScreenBlock, { block: 'chart-card' }>): string {
  return block.chart.labels
    ? `<div class="df-chart-labels" style="grid-template-columns: repeat(${block.chart.labels.length}, 1fr);">${block.chart.labels
        .map((label) => `<span>${escapeHtml(label)}</span>`)
        .join('')}</div>`
    : '';
}

function blockInnerHtml(block: ScreenBlock): string {
  switch (block.block) {
    case 'app-header':
      return `${iconHtml(block.icon)}
        <div class="df-screen-header-text">
          <div class="df-screen-title">${escapeHtml(block.title)}</div>
          ${block.subtitle ? `<div class="df-screen-subtitle">${escapeHtml(block.subtitle)}</div>` : ''}
        </div>`;
    case 'stat-strip':
      return `<div class="df-stat-strip" style="grid-template-columns: repeat(${block.tiles.length}, minmax(0, 1fr));">${block.tiles
        .map(
          (tile) => `<div class="df-stat-tile">
            <div>${counterHtml(tile.value, 'df-stat-value')}</div>
            <div class="df-stat-label">${escapeHtml(tile.label)}</div>
            ${
              tile.delta
                ? `<div class="df-stat-delta df-stat-delta-${tile.delta.dir}">${tile.delta.dir === 'up' ? '+' : '-'}${Math.abs(tile.delta.value)}</div>`
                : ''
            }
          </div>`,
        )
        .join('')}</div>`;
    case 'chart-card':
      return `${block.title ? `<div class="df-chart-card-title">${escapeHtml(block.title)}</div>` : ''}
        <div class="df-chart">${chartSvg(block.chart)}${chartLabels(block)}</div>`;
    case 'card-grid':
      return `<div class="df-card-grid">${block.cards
        .map(
          (card) => `<div class="df-grid-card">
            <div class="df-grid-card-top">
              <div class="df-grid-card-heading">
                ${iconHtml(card.icon)}
                <div class="df-grid-card-title">${escapeHtml(card.title)}</div>
              </div>
              ${card.badge ? `<div class="df-grid-badge">${escapeHtml(card.badge)}</div>` : ''}
            </div>
            ${card.value ? `<div class="df-grid-card-value">${escapeHtml(card.value)}</div>` : ''}
            ${card.desc ? `<div class="df-grid-card-desc">${escapeHtml(card.desc)}</div>` : ''}
          </div>`,
        )
        .join('')}</div>`;
    case 'list':
      return `<div class="df-screen-list">${block.rows
        .map((row) => {
          const marker = row.avatar
            ? `<span class="df-row-avatar" style="${row.avatar.color ? `background:${row.avatar.color}` : ''}">${escapeHtml(row.avatar.initials)}</span>`
            : iconHtml(row.icon);
          return `<div class="df-screen-row">
            ${marker}
            <div class="df-row-main">${escapeHtml(row.label)}</div>
            ${row.trailing ? `<div class="df-row-trailing">${escapeHtml(row.trailing)}</div>` : ''}
          </div>`;
        })
        .join('')}</div>`;
    case 'progress':
      return `<div class="df-progress-list">${block.items
        .map(
          (item, index) => `<div class="df-progress-item">
            <div class="df-progress-top"><span>${escapeHtml(item.label)}</span><span class="df-progress-value">${Math.round(item.value)}%</span></div>
            <div class="df-progress-track"><div class="df-progress-bar" data-progress="${index}" data-value="${item.value}"></div></div>
          </div>`,
        )
        .join('')}</div>`;
    case 'heatmap':
      return `<div class="df-heatmap-grid" style="grid-template-columns: repeat(${block.cols}, 14px);">${block.values
        .map((value) => `<span class="df-heat-cell df-heat-${Math.max(0, Math.min(4, value))}"></span>`)
        .join('')}</div>`;
    case 'callout':
      return block.variant === 'hero-stat'
        ? `<div>${block.value ? counterHtml(block.value, 'df-callout-value') : ''}</div>${block.label ? `<div class="df-callout-label">${escapeHtml(block.label)}</div>` : ''}`
        : `<div class="df-callout-text">${escapeHtml(block.text ?? '')}</div>`;
  }
}

export function blockHtml(block: ScreenBlock, blockIndex: number): string {
  const nameAttr = block.name ? ` data-block-name="${escapeHtml(block.name)}"` : '';
  return `<div class="df-screen-block df-screen-${block.block}" data-block="${blockIndex}"${nameAttr} data-qa-key="block-${blockIndex}">
    ${blockInnerHtml(block)}
  </div>`;
}
