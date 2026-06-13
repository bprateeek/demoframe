export const baseCss = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; }
body {
  background: var(--df-page);
  font-family: var(--df-font-sans);
  color: var(--df-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow: hidden;
}
svg { display: block; width: 100%; height: 100%; }
.df-stage {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.df-safe {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.df-scene {
  position: absolute;
  inset: 0;
  opacity: 0;
  display: flex;
  flex-direction: column;
}
.df-rail {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--df-s5);
}
.df-chrome-stack {
  position: relative;
  flex: 0 0 auto;
}
.df-chrome-layer {
  opacity: 0;
}
.df-chrome-layer:first-child {
  position: relative;
}
.df-chrome-layer:not(:first-child) {
  position: absolute;
  inset: 0;
}
.df-logo-slot {
  justify-self: end;
  display: flex;
  align-items: center;
}
.df-logo-header { height: 20px; width: auto; display: block; }
.df-logo-corner {
  position: absolute;
  right: var(--df-s4);
  bottom: var(--df-s4);
  height: 28px;
  opacity: 0;
  z-index: 1;
}
.df-logo-corner img { height: 100%; width: auto; display: block; opacity: 0.85; }
.df-slot-header { flex: 0 0 auto; }
.df-slot-body { flex: 1 1 auto; min-height: 0; }
.df-slot-footer { flex: 0 0 auto; margin-top: auto; }
.df-cursor {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2.5px solid rgba(28, 32, 40, 0.55);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  opacity: 0;
  display: none;
  z-index: 5;
}
.df-cursor-ripple {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px solid rgba(28, 32, 40, 0.5);
  opacity: 0;
}
.df-celebrate {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  opacity: 0;
  display: none;
  z-index: 5;
}
.df-celebrate-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2.5px solid var(--df-accent);
}
.df-celebrate-check {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--df-success);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.df-celebrate-check svg { width: 18px; height: 18px; }
.df-celebrate-dot {
  position: absolute;
  left: 0;
  top: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--df-accent);
}
`;
