import type { DemoConfig } from '../config/schema.js';
import { shotObjectTextLeaves, sceneTextLeaves } from './sceneText.js';

export interface StaticQaFinding {
  code: 'qa.text-dwell.estimated';
  message: string;
  details: { at: string; duration: number; required: number; words: number };
}

function weightedWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).reduce((sum, token) =>
    sum + (/[\d/\\._:;{}()[\]<>=$-]/.test(token) ? 1.35 : 1), 0);
}

export function requiredTextDwell(text: string): number {
  return Math.min(6, Math.max(0.8, 0.35 + (weightedWords(text) / 200) * 60));
}

export function staticQaFindings(config: DemoConfig): StaticQaFinding[] {
  const findings: StaticQaFinding[] = [];
  const inspect = (at: string, duration: number, leaves: ReturnType<typeof sceneTextLeaves>) => {
    for (const leaf of leaves.filter((item) => item.durable)) {
      const required = requiredTextDwell(leaf.text);
      if (duration >= required * 0.9) continue;
      findings.push({
        code: 'qa.text-dwell.estimated',
        message: `${at}.${leaf.path}: declared ${duration.toFixed(2)}s is below the estimated ${required.toFixed(2)}s text dwell`,
        details: { at: `${at}.${leaf.path}`, duration, required, words: weightedWords(leaf.text) },
      });
    }
  };
  if ((config.shots?.length ?? 0) > 0) {
    config.shots!.forEach((shot, shotIndex) => shot.objects.forEach((object, objectIndex) =>
      inspect(`shots[${shotIndex}].objects[${objectIndex}]`, shot.duration, shotObjectTextLeaves(object)),
    ));
  } else {
    config.scenes.forEach((scene, sceneIndex) => inspect(`scenes[${sceneIndex}]`, scene.duration, sceneTextLeaves(scene)));
  }
  return findings;
}
