(() => {
  const spec = window.ANIMATIC;
  if (!spec || !Array.isArray(spec.shots)) throw new Error('window.ANIMATIC.shots is required');

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const ease = (value) => {
    const p = clamp(value);
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  };
  const shotEls = new Map(
    Array.from(document.querySelectorAll('[data-shot]')).map((element) => [element.dataset.shot, element]),
  );
  const clock = document.querySelector('[data-animatic-clock]');

  function shotOpacity(p, shot) {
    const enter = shot.enter ?? 0.12;
    const exit = shot.exit ?? 0.12;
    const incoming = enter === 0 ? 1 : ease(p / enter);
    const outgoing = exit === 0 ? 1 : ease((1 - p) / exit);
    return Math.min(incoming, outgoing);
  }

  function setRevealProgress(element, p) {
    const index = Number(element.dataset.reveal ?? 0);
    const start = 0.12 + index * 0.09;
    const progress = ease((p - start) / 0.16);
    element.style.setProperty('--reveal', progress.toFixed(4));
  }

  function setCounter(element, p) {
    const target = Number(element.dataset.count ?? 0);
    const decimals = Number(element.dataset.decimals ?? 0);
    const prefix = element.dataset.prefix ?? '';
    const suffix = element.dataset.suffix ?? '';
    const progress = ease((p - 0.12) / 0.35);
    element.textContent = `${prefix}${(target * progress).toFixed(decimals)}${suffix}`;
  }

  function seek(ms) {
    const durationMs = spec.duration * 1000;
    const raw = Math.max(0, Number(ms) || 0);
    const t = Math.min(raw / 1000, spec.duration - 0.0001);
    document.documentElement.style.setProperty('--timeline-p', (t / spec.duration).toFixed(6));
    document.documentElement.style.setProperty('--timeline-s', t.toFixed(4));
    if (clock) clock.textContent = `${t.toFixed(1)} / ${spec.duration.toFixed(1)}s`;

    for (const shot of spec.shots) {
      const element = shotEls.get(shot.id);
      if (!element) continue;
      const span = Math.max(0.001, shot.end - shot.start);
      const p = clamp((t - shot.start) / span);
      const active = t >= shot.start && t < shot.end;
      element.dataset.active = active ? 'true' : 'false';
      element.style.setProperty('--p', p.toFixed(6));
      element.style.setProperty('--ease', ease(p).toFixed(6));
      element.style.opacity = active ? shotOpacity(p, shot).toFixed(4) : '0';
      element.style.pointerEvents = active ? 'auto' : 'none';
      element.querySelectorAll('[data-reveal]').forEach((child) => setRevealProgress(child, p));
      element.querySelectorAll('[data-count]').forEach((child) => setCounter(child, p));
    }

    window.dispatchEvent(new CustomEvent('animatic:seek', { detail: { t, durationMs } }));
  }

  window.__seek = seek;
  seek(0);

  const params = new URLSearchParams(location.search);
  if (params.get('paused') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const started = performance.now();
  function tick(now) {
    const elapsed = (now - started) % (spec.duration * 1000);
    seek(elapsed);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
