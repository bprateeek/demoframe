export function runtimeJs(timelineJson: string): string {
  return `(() => {
  const T = ${timelineJson};
  const els = {};
  T.scenes.forEach((s) => {
    const el = document.querySelector('[data-scene="' + s.index + '"]');
    if (el) els[s.index] = el;
  });
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  const updaters = {
    typing(el, s, lt) {
      const d = s.duration;
      const text = s.data.text;
      const t0 = Math.min(0.4, d * 0.08);
      const t1 = d * 0.82;
      const p = clamp((lt - t0) / (t1 - t0), 0, 1);
      const n = Math.round(p * text.length);
      el.querySelector('.df-typed').textContent = text.slice(0, n);
      const ph = el.querySelector('.df-placeholder');
      if (ph) ph.style.display = n > 0 ? 'none' : '';
      const caret = el.querySelector('.df-caret-blink');
      if (caret) caret.style.opacity = p > 0 && p < 1 ? 1 : Math.floor(lt * 2) % 2 ? 0 : 1;
      const send = el.querySelector('.df-send');
      if (send) {
        send.classList.toggle('df-armed', n > 0);
        send.classList.toggle('df-pressed', !!s.data.send && lt > d * 0.94);
      }
    },
    steps(el, s, lt) {
      const n = s.data.count;
      const d = s.duration;
      for (let k = 0; k < n; k++) {
        const row = el.querySelector('[data-step="' + k + '"]');
        if (!row) continue;
        const at = (d * (k + 1)) / (n + 1.6);
        const e = ease(clamp((lt - at) / 0.35, 0, 1));
        row.style.opacity = e;
        row.style.transform = 'translateY(' + 10 * (1 - e) + 'px)';
      }
      const dot = el.querySelector('.df-step-dot');
      if (dot) dot.style.transform = 'scale(' + (1 + 0.18 * Math.sin(lt * Math.PI * 2.2)) + ')';
    },
    'status-card'(el, s, lt) {
      const body = el.querySelector('.df-card-body');
      const rise = ease(clamp(lt / 0.5, 0, 1));
      body.style.opacity = rise;
      body.style.transform = 'translateY(' + 18 * (1 - rise) + 'px)';
      for (let k = 0; k < s.data.checks; k++) {
        const row = el.querySelector('[data-check="' + k + '"]');
        if (row) row.style.opacity = ease(clamp((lt - (0.45 + k * 0.22)) / 0.3, 0, 1));
      }
      const cta = el.querySelector('.df-cta');
      if (cta) {
        const p = ease(clamp((lt - (0.5 + s.data.checks * 0.22)) / 0.35, 0, 1));
        cta.style.opacity = p;
        cta.style.transform = 'translateY(' + 10 * (1 - p) + 'px) scale(' + (0.97 + 0.03 * p) + ')';
      }
      const cap = el.querySelector('.df-card-caption');
      if (cap) cap.style.opacity = ease(clamp((lt - (0.7 + s.data.checks * 0.22)) / 0.35, 0, 1));
    },
    screenshot(el, s, lt) {
      const img = el.querySelector('img');
      const p = ease(clamp(lt / s.duration, 0, 1));
      const pan = s.data.pan;
      let tr = 'scale(1)';
      if (pan === 'zoom-in') tr = 'scale(' + (1 + 0.12 * p) + ')';
      else if (pan === 'zoom-out') tr = 'scale(' + (1.12 - 0.12 * p) + ')';
      else if (pan === 'up') tr = 'scale(1.14) translateY(' + (3 - 6 * p) + '%)';
      else if (pan === 'down') tr = 'scale(1.14) translateY(' + (-3 + 6 * p) + '%)';
      else if (pan === 'left') tr = 'scale(1.14) translateX(' + (3 - 6 * p) + '%)';
      else if (pan === 'right') tr = 'scale(1.14) translateX(' + (-3 + 6 * p) + '%)';
      img.style.transform = tr;
    },
    hold() {},
  };

  function apply(s, lt, opacity) {
    const el = els[s.index];
    if (!el) return;
    el.style.opacity = opacity;
    const fn = updaters[s.type];
    if (fn) fn(el, s, lt);
  }

  window.__seek = (tMs) => {
    const t = clamp(tMs / 1000, 0, T.duration - 1e-4);
    let a = T.scenes.findIndex((s) => t < s.end - 1e-9);
    if (a < 0) a = T.scenes.length - 1;
    const act = T.scenes[a];
    T.scenes.forEach((s) => {
      const el = els[s.index];
      if (el) el.style.opacity = 0;
    });
    const rScene = T.scenes[act.renderIndex];
    const lt = act.index === rScene.index ? t - act.start : rScene.duration;
    let curOpacity = 1;
    if (act.transition === 'crossfade' && a > 0) {
      const fade = Math.min(T.fade, act.duration / 2);
      const fp = clamp((t - act.start) / fade, 0, 1);
      if (fp < 1) {
        const prev = T.scenes[T.scenes[a - 1].renderIndex];
        if (prev.index !== rScene.index) apply(prev, prev.duration, 1);
        curOpacity = fp;
      }
    }
    apply(rScene, lt, curOpacity);
  };
  window.__seek(0);
})();`;
}
