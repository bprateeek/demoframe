const GAP_PENALTY = 0.15;
const START_BONUS = 0.3;
const BOUNDARY_BONUS = 0.2;

function isBoundary(target, index) {
  if (index === 0) return true;
  const prev = target[index - 1];
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === '.';
}

export function score(query, target) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return 0;
  let qi = 0;
  let total = 0;
  let lastHit = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    let hit = 1;
    if (ti === 0) hit += START_BONUS;
    if (isBoundary(target, ti)) hit += BOUNDARY_BONUS;
    if (lastHit >= 0) hit -= (ti - lastHit - 1) * GAP_PENALTY;
    total += Math.max(hit, 0.1);
    lastHit = ti;
    qi++;
  }
  if (qi < q.length) return 0;
  return total / (q.length * (1 + START_BONUS + BOUNDARY_BONUS));
}

export function best(query, candidates, limit = 5) {
  return candidates
    .map((candidate) => ({ candidate, score: score(query, candidate) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function highlight(query, target, open = '[', close = ']') {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let out = '';
  for (let ti = 0; ti < target.length; ti++) {
    if (qi < q.length && t[ti] === q[qi]) {
      out += open + target[ti] + close;
      qi++;
    } else {
      out += target[ti];
    }
  }
  return qi === q.length ? out : target;
}
