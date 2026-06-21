import type { RenderSession } from '../render/browser.js';
import type { Timeline, TimelineScene } from '../render/timeline.js';

export interface LayoutFinding {
  sceneIndex: number;
  sceneName: string;
  kind: 'overflow' | 'clipped-key' | 'focus-framing' | 'scroll-framing';
  detail: string;
}

function sceneName(scene: TimelineScene): string {
  return scene.name ?? scene.type;
}

export async function measureLayout(
  session: RenderSession,
  timeline: Timeline,
): Promise<LayoutFinding[]> {
  const findings: LayoutFinding[] = [];
  for (const scene of timeline.scenes) {
    if (scene.type === 'hold') continue;
    await session.seek(Math.max(0, scene.end * 1000 - 50));
    const layoutPayload = {
      renderIndex: scene.renderIndex,
      sceneType: String(scene.type),
      motion: typeof scene.data.motion === 'string' ? scene.data.motion : undefined,
      focusIndex: typeof scene.data.focusIndex === 'number' ? scene.data.focusIndex : undefined,
      sceneName: sceneName(scene),
    };
    const sceneFindings = await session.page.evaluate(
      new Function(
        'payload',
        `
        const { renderIndex, sceneType, motion, focusIndex, sceneName } = payload;
        const out = [];
        const active = document.querySelector('[data-scene="' + renderIndex + '"]');
        const safe = active?.closest('.df-safe');
        const rail = active?.querySelector('.df-rail');
        if (!active || !safe || !rail) return out;

        const safeRect = safe.getBoundingClientRect();
        const content =
          active.querySelector('.df-screen-stack') ??
          rail.firstElementChild ??
          rail;
        const contentRect = content.getBoundingClientRect();
        const slack = 1.5;
        const outside = (rect) =>
          rect.top < safeRect.top - slack ||
          rect.left < safeRect.left - slack ||
          rect.right > safeRect.right + slack ||
          rect.bottom > safeRect.bottom + slack;
        const describeRect = (label, rect) =>
          label + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ' at ' +
          Math.round(rect.left - safeRect.left) + ',' + Math.round(rect.top - safeRect.top) + ' exceeds safe ' +
          Math.round(safeRect.width) + 'x' + Math.round(safeRect.height);

        if (sceneType === 'screen' && motion === 'scroll') {
          const blocks = Array.from(active.querySelectorAll('[data-block]'));
          const finalBlock = blocks.at(-1);
          if (finalBlock) {
            const rect = finalBlock.getBoundingClientRect();
            if (outside(rect)) {
              out.push({ kind: 'scroll-framing', detail: describeRect('final block', rect) });
            }
          }
          return out;
        }

        if (sceneType === 'screen' && motion === 'focus') {
          const block =
            typeof focusIndex === 'number'
              ? active.querySelector('[data-block="' + focusIndex + '"]')
              : null;
          if (block) {
            const rect = block.getBoundingClientRect();
            const tooSmall = rect.width < safeRect.width * 0.22 || rect.height < safeRect.height * 0.12;
            if (outside(rect) || tooSmall) {
              out.push({ kind: 'focus-framing', detail: describeRect('focused block', rect) });
            }
          }
          return out;
        }

        if (content.scrollHeight > safe.clientHeight + slack || outside(contentRect)) {
          out.push({ kind: 'overflow', detail: describeRect('content', contentRect) });
        }

        active.querySelectorAll('[data-qa-key]').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (outside(rect)) {
            const key = el.getAttribute('data-qa-key') ?? 'key element';
            out.push({ kind: 'clipped-key', detail: describeRect(key, rect) });
          }
        });

        return out.map((finding) => ({
          ...finding,
          detail: sceneName + ': ' + finding.detail,
        }));
      `,
      ) as (payload: typeof layoutPayload) => Array<{ kind: LayoutFinding['kind']; detail: string }>,
      layoutPayload,
    );
    for (const finding of sceneFindings) {
      findings.push({
        sceneIndex: scene.index,
        sceneName: sceneName(scene),
        kind: finding.kind,
        detail: finding.detail,
      });
    }
  }
  return findings;
}
