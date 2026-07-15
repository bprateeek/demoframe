import { MOTION_PRESET_REGISTRY } from './motion/presets.js';

export function runtimeJs(timelineJson: string, includeCompositor = false): string {
  const motionPresetJson = JSON.stringify(MOTION_PRESET_REGISTRY);
  return `(() => {
  const T = ${timelineJson};
  const MOTION_PRESETS = ${motionPresetJson};
  const els = {};
  T.scenes.forEach((s) => {
    const el = document.querySelector('[data-scene="' + s.index + '"]');
    if (el) els[s.index] = el;
  });
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const easeByName = {
    linear: (p) => p,
    'ease-out-cubic': (p) => 1 - Math.pow(1 - p, 3),
    'ease-in-out-cubic': (p) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  };
  const motionIdentity = { x: 0, y: 0, scale: 1, opacity: 1 };

  const SEND_PRESS = 0.94;
  const scenesEl = document.querySelector('.df-scenes');
  const chromeEls = Array.from(document.querySelectorAll('[data-chrome]'));
  const ambientEl = document.querySelector('[data-ambient="ember"]');
  const emberEls = ambientEl ? Array.from(ambientEl.querySelectorAll('.df-ember')) : [];
  const burstEl = document.querySelector('.df-celebrate');
  const dipEl = document.querySelector('.df-dip');
${includeCompositor ? `  const shotLayers = {};
  document.querySelectorAll('[data-shot-layer]').forEach((el) => { shotLayers[el.dataset.shotLayer] = el; });
  const shotObjects = {};
  document.querySelectorAll('[data-shot-object]').forEach((el) => { shotObjects[el.dataset.shotObject] = el; });
  const sceneByIndex = {};
  T.scenes.forEach((scene) => { sceneByIndex[scene.index] = scene; });
` : ''}

  function setChromeLayer(layer, opacity) {
    chromeEls.forEach((el) => {
      if (el.getAttribute('data-chrome') === String(layer)) el.style.opacity = String(opacity);
    });
  }

  function formatNumber(v, dec) {
    const fixed = Math.abs(v).toFixed(dec);
    const parts = fixed.split('.');
    const grouped = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
    return (v < 0 ? '-' : '') + grouped + (parts[1] ? '.' + parts[1] : '');
  }

  function animateCounterText(el, value, prefix, suffix, decimals, p) {
    if (!el) return;
    const eo = 1 - Math.pow(1 - clamp(p, 0, 1), 3);
    el.textContent = prefix + formatNumber(value * eo, decimals) + suffix;
  }

  function animateDatasetCounter(el, p) {
    animateCounterText(
      el,
      Number(el.dataset.value || 0),
      el.dataset.prefix || '',
      el.dataset.suffix || '',
      Number(el.dataset.decimals || 0),
      p,
    );
  }

  function motionEase(name, p) {
    return (easeByName[name] || easeByName.linear)(clamp(p, 0, 1));
  }

  function motionWindowProgress(window, tp) {
    if (!window) return 1;
    const span = Math.max(0.0001, window.end - window.start);
    return motionEase(window.easing, (tp - window.start) / span);
  }

  function mixMotionState(a, b, p) {
    return {
      x: a.x + (b.x - a.x) * p,
      y: a.y + (b.y - a.y) * p,
      scale: a.scale + (b.scale - a.scale) * p,
      opacity: a.opacity + (b.opacity - a.opacity) * p,
    };
  }

  function motionTrackState(track, windows, tp) {
    if (!track) return motionIdentity;
    const entrance = windows.entrance;
    const settle = windows.settle;
    if (entrance && tp < entrance.end) {
      return mixMotionState(track.from, track.settle, motionWindowProgress(entrance, tp));
    }
    if (settle && tp < settle.end) {
      return mixMotionState(track.settle, track.to, motionWindowProgress(settle, tp));
    }
    return track.to;
  }

  function setMotionVars(el, prefix, state) {
    if (!el) return;
    el.style.setProperty('--df-' + prefix + '-motion-x', state.x.toFixed(3) + 'px');
    el.style.setProperty('--df-' + prefix + '-motion-y', state.y.toFixed(3) + 'px');
    el.style.setProperty('--df-' + prefix + '-motion-scale', state.scale.toFixed(4));
    el.style.setProperty('--df-' + prefix + '-motion-opacity', state.opacity.toFixed(4));
  }

  function applyMotion(el, s, lt) {
    const sceneMotion = el.querySelector('.df-scene-motion');
    const railMotion = sceneMotion ? sceneMotion.querySelector('.df-rail-motion') : null;
    const motionName = s.data.cinematic && s.data.cinematic.motion;
    const preset = motionName ? MOTION_PRESETS[motionName] : null;
    const eligible = preset && preset.eligibleSceneTypes.includes(s.type);
    const tp = clamp(lt / Math.max(0.0001, s.duration), 0, 1);
    const sceneState = eligible ? motionTrackState(preset.wrappers && preset.wrappers.scene, preset.windows, tp) : motionIdentity;
    const railState = eligible ? motionTrackState(preset.wrappers && preset.wrappers.rail, preset.windows, tp) : motionIdentity;
    setMotionVars(sceneMotion, 'scene', sceneState);
    setMotionVars(railMotion, 'rail', railState);
  }

  function animateChart(scope, d, lt, startRatio) {
    const start = (startRatio ?? 0.35) * d;
    const bars = scope.querySelectorAll('[data-bar]');
    bars.forEach((bar, k) => {
      const at = start + (k * 0.5 * d) / Math.max(1, bars.length);
      bar.style.transform = 'scaleY(' + ease(clamp((lt - at) / 0.4, 0, 1)) + ')';
    });
    const line = scope.querySelector('.df-chart-line');
    if (line) {
      const p = ease(clamp((lt - start) / (0.45 * d), 0, 1));
      line.style.setProperty('--df-chart-reveal', String(p));
      const area = scope.querySelector('.df-chart-area');
      if (area) area.style.opacity = String(0.85 * p);
    }
    const labels = scope.querySelector('.df-chart-labels');
    if (labels) labels.style.opacity = ease(clamp((lt - 0.8 * d) / 0.3, 0, 1));
  }

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
        send.classList.toggle('df-pressed', !!s.data.send && lt > d * SEND_PRESS);
      }
    },
    steps(el, s, lt) {
      const n = s.data.count;
      const d = s.duration;
      const divisor = el.closest('[data-shot-object]') ? n + 3.5 : n + 1.6;
      for (let k = 0; k < n; k++) {
        const row = el.querySelector('[data-step="' + k + '"]');
        if (!row) continue;
        const at = (d * (k + 1)) / divisor;
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
    'terminal-playback'(el, s, lt) {
      const d = s.duration;
      const cmd = s.data.command;
      const n = s.data.lines;
      const pretyped = Boolean(s.data.pretyped);
      const t0 = pretyped ? 0 : Math.min(0.4, d * 0.08);
      const tRun = pretyped ? 0 : t0 + d * 0.3;
      const p = pretyped ? 1 : clamp((lt - t0) / (tRun - t0), 0, 1);
      el.querySelector('.df-play-typed').textContent = cmd.slice(0, Math.round(p * cmd.length));
      const caret = el.querySelector('.df-play-caret');
      if (caret) caret.style.opacity = lt >= tRun ? 0 : p > 0 && p < 1 ? 1 : Math.floor(lt * 2) % 2 ? 0 : 1;
      const outStart = tRun + 0.08 * d;
      const outEnd = 0.88 * d;
      for (let k = 0; k < n; k++) {
        const row = el.querySelector('[data-line="' + k + '"]');
        if (row) row.style.opacity = lt >= outStart + (k * (outEnd - outStart)) / n ? 1 : 0;
      }
      const spin = el.querySelector('.df-play-spin');
      if (spin) {
        const on = lt >= tRun && lt < (n ? outStart : 0.9 * d);
        spin.style.display = on ? 'inline-flex' : 'none';
        if (on) {
          const glyphs = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
          spin.querySelector('.df-play-spin-glyph').textContent = glyphs[Math.floor(lt * 10) % glyphs.length];
        }
      }
      const exit = el.querySelector('.df-play-exit');
      if (exit) exit.style.opacity = lt >= 0.9 * d ? 1 : 0;
      const next = el.querySelector('.df-play-next');
      if (next) {
        next.style.opacity = lt >= 0.94 * d ? 1 : 0;
        next.querySelector('.df-term-caret').style.opacity = Math.floor(lt * 2) % 2 ? 0 : 1;
      }
      // A session taller than the frame pins to the bottom like a real terminal,
      // so the newest lines (and the climax) stay visible instead of clipping.
      const play = el.querySelector('.df-slot-header.df-play');
      if (play) {
        play.style.transform = '';
        const over = play.getBoundingClientRect().bottom - (el.getBoundingClientRect().bottom - 16);
        if (over > 0) play.style.transform = 'translateY(' + -over + 'px)';
      }
    },
    code(el, s, lt) {
      const d = s.duration;
      const lines = el.querySelectorAll('.df-codepanel-body .line');
      if (s.data.reveal === 'none') {
        lines.forEach((line) => { line.style.opacity = 1; });
        return;
      }
      if (s.data.reveal === 'fade') {
        const p = ease(clamp((lt - 0.05 * d) / 0.5, 0, 1));
        lines.forEach((line) => { line.style.opacity = p; });
        return;
      }
      const t0 = 0.05 * d;
      const t1 = 0.7 * d;
      lines.forEach((line, k) => {
        const at = t0 + (k * (t1 - t0)) / Math.max(1, s.data.lines);
        const e = ease(clamp((lt - at) / 0.3, 0, 1));
        line.style.opacity = e;
        line.style.transform = 'translateY(' + 4 * (1 - e) + 'px)';
      });
    },
    chat(el, s, lt) {
      const d = s.duration;
      const msgs = s.data.messages;
      const t0 = 0.05 * d;
      const span = 0.92 * d - t0;
      const weights = msgs.map((m) => 12 + m.length);
      const totalW = weights.reduce((a, b) => a + b, 0);
      let acc = t0;
      for (let k = 0; k < msgs.length; k++) {
        const slot = (span * weights[k]) / totalW;
        const wrap = el.querySelector('[data-msg="' + k + '"]');
        if (!wrap) { acc += slot; continue; }
        wrap.style.display = lt >= acc ? 'flex' : 'none';
        const typing = wrap.querySelector('.df-chat-typing');
        const popAt = typing ? acc + slot * 0.35 : acc;
        if (typing) {
          const on = lt >= acc && lt < popAt;
          typing.style.display = on ? 'inline-flex' : 'none';
          if (on) {
            typing.querySelectorAll('i').forEach((dot, j) => {
              dot.style.opacity = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(lt * 7 - j * 0.9));
            });
          }
        }
        const bubble = wrap.querySelector('.df-bubble');
        const e = ease(clamp((lt - popAt) / 0.3, 0, 1));
        bubble.style.opacity = e;
        bubble.style.transform = 'translateY(' + 8 * (1 - e) + 'px) scale(' + (0.97 + 0.03 * e) + ')';
        acc += slot;
      }
    },
    'metric-card'(el, s, lt) {
      const d = s.duration;
      s.data.metrics.forEach((m, k) => {
        const item = el.querySelector('[data-metric="' + k + '"]');
        if (!item) return;
        const at = 0.15 * d + k * 0.15;
        const e = ease(clamp((lt - at) / 0.35, 0, 1));
        item.style.opacity = e;
        item.style.transform = 'translateY(' + 8 * (1 - e) + 'px)';
        const cp = clamp((lt - at) / Math.max(0.3, 0.6 * d - at), 0, 1);
        animateCounterText(item.querySelector('.df-metric-value'), m.value, m.prefix, m.suffix, m.decimals, cp);
      });
      if (s.data.chart) animateChart(el, d, lt, 0.35);
      const title = el.querySelector('.df-metric-title');
      if (title) title.style.opacity = ease(clamp((lt - 0.02 * d) / 0.3, 0, 1));
      const cap = el.querySelector('.df-metric-caption');
      if (cap) cap.style.opacity = ease(clamp((lt - 0.85 * d) / 0.3, 0, 1));
    },
    screen(el, s, lt) {
      const d = s.duration;
      const motion = s.data.motion || 'reveal';
      const safe = el.closest('.df-safe');
      const stack = el.querySelector('.df-screen-stack');
      const blocks = Array.from(el.querySelectorAll('[data-block]'));
      if (!stack) return;

      blocks.forEach((block, k) => {
        const at = motion === 'reveal' ? 0.12 + k * 0.14 : 0.05;
        const e = ease(clamp((lt - at) / 0.38, 0, 1));
        block.style.opacity = e;
        block.style.transform = motion === 'reveal' ? 'translateY(' + 12 * (1 - e) + 'px)' : 'translateY(0)';
        block.querySelectorAll('.df-screen-counter').forEach((counter) => {
          animateDatasetCounter(counter, clamp((lt - at) / Math.max(0.35, d * 0.45 - at), 0, 1));
        });
        block.querySelectorAll('[data-progress]').forEach((bar) => {
          const target = Number(bar.dataset.value || 0) / 100;
          bar.style.transform = 'scaleX(' + target * ease(clamp((lt - at) / 0.55, 0, 1)) + ')';
        });
        if (block.querySelector('.df-chart')) animateChart(block, d, lt, Math.min(0.55, (at + 0.15) / d));
      });

      if (motion === 'focus') {
        stack.style.transform = 'translate(0,0) scale(1)';
        const focus = typeof s.data.focusIndex === 'number' ? el.querySelector('[data-block="' + s.data.focusIndex + '"]') : null;
        if (safe && focus) {
          const sr = safe.getBoundingClientRect();
          const br = focus.getBoundingClientRect();
          const scale = clamp(Math.min((sr.width * 0.86) / br.width, (sr.height * 0.78) / br.height), 1, 1.65);
          const dx = sr.left + sr.width / 2 - (br.left + br.width / 2);
          const dy = sr.top + sr.height / 2 - (br.top + br.height / 2);
          const p = ease(clamp((lt - d * 0.24) / (d * 0.48), 0, 1));
          stack.style.transform = 'translate(' + dx * p + 'px,' + dy * p + 'px) scale(' + (1 + (scale - 1) * p) + ')';
        }
      } else if (motion === 'scroll') {
        const maxScroll = Math.max(0, stack.scrollHeight - (safe ? safe.clientHeight : stack.clientHeight));
        const p = ease(clamp((lt - d * 0.18) / (d * 0.66), 0, 1));
        stack.style.transform = 'translateY(' + -maxScroll * p + 'px)';
      } else {
        stack.style.transform = 'translateY(0)';
      }
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
    applyMotion(el, s, lt);
    const fn = updaters[s.type];
    if (fn) fn(el, s, lt);
  }

  function drawAmbient(t) {
    if (!ambientEl) return;
    const span = Math.max(T.duration, 1);
    const p = t / span;
    const baseX = Math.sin(p * Math.PI * 2) * 6;
    const baseY = Math.cos(p * Math.PI * 2) * 5;
    ambientEl.style.transform = 'translate3d(' + baseX.toFixed(2) + 'px,' + baseY.toFixed(2) + 'px,0)';
    emberEls.forEach((el, k) => {
      const phase = p * Math.PI * 2 + k * 1.37;
      const drift = 4 + k * 1.5;
      const x = Math.sin(phase) * drift;
      const y = Math.cos(phase * 0.8) * drift * 0.7;
      const scale = 1 + Math.sin(phase * 0.7) * 0.025;
      el.style.transform =
        'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + scale.toFixed(3) + ')';
    });
  }

  // Singleton overlays. Flags and timing come from the active scene 'act' (which
  // may be a hold); the target DOM comes from the render scene 'rScene', so a
  // trailing hold can celebrate the held scene's result.
  function drawOverlays(act, rScene, curOpacity, t) {
    if (!scenesEl) return;
    const d = act.duration;
    const tp = clamp((t - act.start) / d, 0, 1);
    const renderEl = els[rScene.index];
    const host = scenesEl.getBoundingClientRect();

    if (burstEl) {
      if (act.data.celebrate) {
        const anchor = renderEl
          ? renderEl.querySelector('.df-cta') ||
            renderEl.querySelector('[data-celebrate-anchor="value"]') ||
            renderEl.querySelector('[data-celebrate-anchor="title"]') ||
            renderEl.querySelector('[data-celebrate-anchor]')
          : null;
        let cx = host.width / 2;
        let cy = host.height / 2;
        if (anchor) {
          const r = anchor.getBoundingClientRect();
          if (anchor.getAttribute('data-celebrate-anchor') === 'right') {
            // Line-based layouts (terminal exit) keep text above and below the
            // anchor, so the burst sits in the empty space to its right.
            cx = Math.min(r.left - host.left + r.width + 46, host.width - 42);
            cy = r.top - host.top + r.height / 2;
          } else {
            cx = r.left - host.left + r.width / 2;
            // Sit just above the element so the burst never occludes its label.
            cy = r.top - host.top - 18;
          }
        }
        const insetX = Math.min(64, host.width / 2);
        const insetY = Math.min(64, host.height / 2);
        cx = clamp(cx, insetX, host.width - insetX);
        cy = clamp(cy, insetY, host.height - insetY);
        const bp = clamp((t - act.start) / 0.5, 0, 1);
        const fadeIn = ease(clamp(bp / 0.12, 0, 1));
        const fadeOut = 1 - ease(clamp((bp - 0.7) / 0.3, 0, 1));
        burstEl.style.display = 'block';
        burstEl.style.opacity = String(curOpacity * fadeIn * fadeOut);
        burstEl.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
        const ring = burstEl.querySelector('.df-celebrate-ring');
        if (ring) ring.style.transform = 'translate(-50%,-50%) scale(' + (0.5 + bp * 1.7) + ')';
        const check = burstEl.querySelector('.df-celebrate-check');
        if (check) {
          check.style.display = anchor ? 'flex' : 'none';
          const cs = bp < 0.5 ? 0.8 + 0.4 * ease(bp / 0.5) : 1.2 - 0.2 * ease((bp - 0.5) / 0.5);
          check.style.transform = 'translate(-50%,-50%) scale(' + cs + ')';
        }
        for (let k = 0; k < 6; k++) {
          const dot = burstEl.querySelector('[data-dot="' + k + '"]');
          if (!dot) continue;
          const ang = ((k * 60 + 15) * Math.PI) / 180;
          const rad = 56 * ease(bp);
          dot.style.transform =
            'translate(-50%,-50%) translate(' +
            Math.cos(ang) * rad +
            'px,' +
            Math.sin(ang) * rad +
            'px) scale(' +
            (1 - bp) +
            ')';
        }
      } else {
        burstEl.style.display = 'none';
      }
    }
  }

${includeCompositor ? `
  function objectEntranceState(type, progress) {
    const p = ease(clamp(progress, 0, 1));
    if (type === 'fade') return { x: 0, y: 0, scale: 1, opacity: p };
    if (type === 'slide-up') return { x: 0, y: 24 * (1 - p), scale: 1, opacity: p };
    if (type === 'slide-left') return { x: 28 * (1 - p), y: 0, scale: 1, opacity: p };
    if (type === 'scale') return { x: 0, y: 0, scale: 0.94 + 0.06 * p, opacity: p };
    return motionIdentity;
  }

  function setShotObjectState(object, shot, localTime, sharedOffset) {
    const wrapper = shotObjects[object.key];
    const descriptor = sceneByIndex[object.sceneIndex];
    if (!wrapper) return;
    const enterDuration = Math.min(object.enter.duration, shot.duration);
    const exitDuration = Math.min(object.exit.duration, shot.duration);
    const enter = object.carried ? motionIdentity : objectEntranceState(object.enter.type, localTime / enterDuration);
    const exitProgress = clamp((localTime - (shot.duration - exitDuration)) / exitDuration, 0, 1);
    const exit = object.exit.type === 'none'
      ? motionIdentity
      : objectEntranceState(object.exit.type, 1 - exitProgress);
    const emphasisProgress = clamp((localTime - object.emphasize.at) / object.emphasize.duration, 0, 1);
    const emphasisPulse = Math.sin(emphasisProgress * Math.PI);
    const emphasisScale = object.emphasize.type === 'focus'
      ? 1 + 0.045 * ease(emphasisProgress)
      : object.emphasize.type === 'pulse' ? 1 + 0.035 * emphasisPulse : 1;
    const offset = sharedOffset || { x: 0, y: 0 };
    wrapper.style.opacity = String(Math.min(enter.opacity, exit.opacity));
    wrapper.style.transform =
      'translate3d(' + (enter.x + exit.x + offset.x) + 'px,' + (enter.y + exit.y + offset.y) + 'px,0) ' +
      'scale(' + (enter.scale * exit.scale * emphasisScale) + ')';
    const objectProgress = ease(clamp(localTime / Math.max(0.001, shot.duration * 0.75), 0, 1));
    wrapper.style.setProperty('--df-object-progress', String(objectProgress));
    const counter = wrapper.querySelector('[data-primitive-counter]');
    if (counter) animateDatasetCounter(counter, objectProgress);
    const parallax = wrapper.querySelector('[data-parallax]');
    if (parallax) {
      const amount = Number(parallax.dataset.parallax || 0);
      parallax.style.setProperty('--df-parallax-x', String(Math.sin(objectProgress * Math.PI) * amount * 80));
      parallax.style.setProperty('--df-parallax-y', String((objectProgress - 0.5) * amount * 50));
    }
    if (descriptor) apply(descriptor, clamp(localTime, 0, descriptor.duration), 1);
  }

  function setShotAmbient(shot, progress) {
    const layer = shotLayers[shot.id];
    if (!layer) return;
    const ambient = layer.querySelector('[data-shot-ambient]');
    if (!ambient) return;
    if (!shot.ambient || shot.ambient.type === 'none') { ambient.style.opacity = 0; return; }
    const fade = 0.08;
    const inP = ease(clamp((progress - shot.ambient.start) / fade, 0, 1));
    const outP = 1 - ease(clamp((progress - (shot.ambient.end - fade)) / fade, 0, 1));
    ambient.style.opacity = String(0.5 * Math.min(inP, outP));
    ambient.style.transform = 'translate3d(' + (Math.sin(progress * Math.PI * 2) * 5) + 'px,' +
      (Math.cos(progress * Math.PI * 2) * 4) + 'px,0)';
  }

  function cameraTransform(shot, progress) {
    if (!shot.camera || shot.camera.move === 'none') return '';
    const layer = shotLayers[shot.id];
    const stage = document.querySelector('.df-compositor');
    if (!layer || !stage) return '';
    const target = Array.from(layer.querySelectorAll('[data-object-id]'))
      .find((el) => el.dataset.objectId === shot.camera.target);
    if (!target) return '';
    const sr = stage.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const p = ease(clamp((progress - 0.12) / 0.62, 0, 1));
    const dx = sr.left + sr.width / 2 - (tr.left + tr.width / 2);
    const dy = sr.top + sr.height / 2 - (tr.top + tr.height / 2);
    const amount = shot.camera.amount || 0;
    const scale = shot.camera.move === 'push' ? 1 + amount * p : 1;
    const panScale = shot.camera.move === 'pan' ? Math.min(1, amount * 5) : Math.min(1, amount * 2.5);
    return 'translate3d(' + (dx * p * panScale) + 'px,' + (dy * p * panScale) + 'px,0) scale(' + scale + ')';
  }

  function directionalOffset(direction, distance) {
    if (direction === 'right') return { x: -distance, y: 0 };
    if (direction === 'up') return { x: 0, y: distance };
    if (direction === 'down') return { x: 0, y: -distance };
    return { x: distance, y: 0 };
  }

  function applyShot(shot, localTime, sharedOffsets) {
    const layer = shotLayers[shot.id];
    if (!layer) return;
    layer.style.opacity = 1;
    const progress = clamp(localTime / shot.duration, 0, 1);
    shot.objects.forEach((object) => setShotObjectState(object, shot, localTime, sharedOffsets && sharedOffsets[object.id]));
    setShotAmbient(shot, progress);
    layer.style.transform = cameraTransform(shot, progress);
  }

  function seekCompositor(tMs) {
    const graph = T.shotGraph;
    const t = clamp(tMs / 1000, 0, graph.duration - 1e-4);
    let activeIndex = graph.shots.findIndex((shot) => t < shot.end - 1e-9);
    if (activeIndex < 0) activeIndex = graph.shots.length - 1;
    const shot = graph.shots[activeIndex];
    const localTime = t - shot.start;
    Object.values(shotLayers).forEach((layer) => {
      layer.style.opacity = 0;
      layer.style.transform = '';
      layer.style.clipPath = '';
    });
    Object.values(shotObjects).forEach((object) => { object.style.opacity = 0; object.style.transform = ''; });
    T.scenes.forEach((scene) => {
      const el = els[scene.index];
      if (el) { el.style.opacity = 0; el.style.transform = ''; }
    });
    chromeEls.forEach((el) => { el.style.opacity = 1; });

    const transition = shot.transition;
    const transitionProgress = transition.type === 'cut' || activeIndex === 0
      ? 1 : ease(clamp(localTime / transition.duration, 0, 1));
    if (activeIndex > 0 && transitionProgress < 1) {
      const previous = graph.shots[activeIndex - 1];
      applyShot(previous, Math.max(0, previous.duration - transition.duration), null);
      const previousLayer = shotLayers[previous.id];
      const currentLayer = shotLayers[shot.id];
      if (transition.type === 'shared-element') {
        const offsets = {};
        shot.objects.forEach((object) => {
          const previousObject = previous.objects.find((candidate) => candidate.id === object.id);
          const from = previousObject && shotObjects[previousObject.key];
          const to = shotObjects[object.key];
          if (!from || !to) return;
          const fr = from.getBoundingClientRect();
          const tr = to.getBoundingClientRect();
          offsets[object.id] = {
            x: (fr.left + fr.width / 2 - (tr.left + tr.width / 2)) * (1 - transitionProgress),
            y: (fr.top + fr.height / 2 - (tr.top + tr.height / 2)) * (1 - transitionProgress),
          };
        });
        if (previousLayer) previousLayer.style.opacity = String(1 - transitionProgress);
        applyShot(shot, localTime, offsets);
        if (currentLayer) currentLayer.style.opacity = String(transitionProgress);
      } else if (transition.type === 'masked-wipe') {
        applyShot(shot, localTime, null);
        if (currentLayer) currentLayer.style.clipPath = 'inset(0 ' + ((1 - transitionProgress) * 100) + '% 0 0)';
      } else if (transition.type === 'directional') {
        applyShot(shot, localTime, null);
        const stage = document.querySelector('.df-compositor');
        const distance = transition.direction === 'up' || transition.direction === 'down'
          ? (stage ? stage.getBoundingClientRect().height : window.innerHeight)
          : (stage ? stage.getBoundingClientRect().width : window.innerWidth);
        const incoming = directionalOffset(transition.direction, distance * (1 - transitionProgress));
        const outgoing = directionalOffset(transition.direction, -distance * transitionProgress);
        if (currentLayer) currentLayer.style.transform =
          'translate3d(' + incoming.x + 'px,' + incoming.y + 'px,0) ' + cameraTransform(shot, localTime / shot.duration);
        if (previousLayer) previousLayer.style.transform = 'translate3d(' + outgoing.x + 'px,' + outgoing.y + 'px,0)';
        if (currentLayer) currentLayer.style.opacity = String(transitionProgress);
        if (previousLayer) previousLayer.style.opacity = String(1 - transitionProgress);
      }
    } else {
      applyShot(shot, localTime, null);
    }
    if (graph.loop && activeIndex === graph.shots.length - 1 && localTime > shot.duration - graph.loop.duration) {
      const loopProgress = ease(clamp((localTime - (shot.duration - graph.loop.duration)) / graph.loop.duration, 0, 1));
      const finalLayer = shotLayers[shot.id];
      const first = graph.shots[0];
      applyShot(first, 0, null);
      const firstLayer = shotLayers[first.id];
      if (finalLayer) finalLayer.style.opacity = String(1 - loopProgress);
      if (firstLayer) firstLayer.style.opacity = String(loopProgress);
    }
  }

` : ''}
  function seekLegacy(tMs) {
    const t = clamp(tMs / 1000, 0, T.duration - 1e-4);
    let a = T.scenes.findIndex((s) => t < s.end - 1e-9);
    if (a < 0) a = T.scenes.length - 1;
    const act = T.scenes[a];
    T.scenes.forEach((s) => {
      const el = els[s.index];
      // Transitions write style.transform on scene roots; clear it so a stale push
      // translate never persists past its window.
      if (el) { el.style.opacity = 0; el.style.transform = ''; }
    });
    chromeEls.forEach((el) => { el.style.opacity = 0; });
    const rScene = T.scenes[act.renderIndex];
    const lt = act.index === rScene.index ? t - act.start : rScene.duration;
    let curOpacity = 1;
    let prevChromeLayer = null;
    let dipCover = 0;
    drawAmbient(t);
    if (act.transition !== 'cut' && a > 0) {
      const fade = Math.min(T.fade, act.duration / 2);
      const fp = clamp((t - act.start) / fade, 0, 1);
      if (fp < 1) {
        const prevAct = T.scenes[a - 1];
        const prev = T.scenes[prevAct.renderIndex];
        // Only animate against the previous scene when it renders different DOM; a
        // hold (or any scene) that re-renders the same frame must not fight itself.
        if (prev.index !== rScene.index) {
          // Push tears sideways when the chrome differs across the pair, so fall
          // back to a crossfade instead of sliding the header with the content.
          let mode = act.transition;
          if (mode === 'push' && prevAct.chromeLayer !== act.chromeLayer) mode = 'crossfade';
          if (mode === 'crossfade') {
            apply(prev, prev.duration, 1);
            curOpacity = fp;
            prevChromeLayer = prevAct.chromeLayer;
          } else if (mode === 'push') {
            const e = easeByName['ease-in-out-cubic'](fp);
            const w = scenesEl ? scenesEl.getBoundingClientRect().width : window.innerWidth;
            apply(prev, prev.duration, 1);
            const prevEl = els[prev.index];
            if (prevEl) prevEl.style.transform = 'translateX(' + (-w * e) + 'px)';
            const inEl = els[rScene.index];
            if (inEl) inEl.style.transform = 'translateX(' + (w * (1 - e)) + 'px)';
          } else if (mode === 'dip-to-color') {
            // Triangular cover: 0 at the ends, 1 at the midpoint where scenes swap.
            dipCover = easeByName['ease-in-out-cubic'](1 - Math.abs(2 * fp - 1));
            if (fp < 0.5) {
              apply(prev, prev.duration, 1);
              curOpacity = 0;
              prevChromeLayer = prevAct.chromeLayer;
            }
          }
        }
      }
    }
    if (dipEl) dipEl.style.opacity = String(dipCover);
    if (prevChromeLayer !== null && prevChromeLayer !== act.chromeLayer) {
      setChromeLayer(prevChromeLayer, 1);
      setChromeLayer(act.chromeLayer, curOpacity);
    } else {
      setChromeLayer(act.chromeLayer, 1);
    }
    apply(rScene, lt, curOpacity);
    drawOverlays(act, rScene, curOpacity, t);
  }
  window.__seek = ${includeCompositor ? 'seekCompositor' : 'seekLegacy'};
  window.__seek(0);
})();`;
}
