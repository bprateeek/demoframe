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
.df-slot-header { flex: 0 0 auto; }
.df-slot-body { flex: 1 1 auto; min-height: 0; }
.df-slot-footer { flex: 0 0 auto; margin-top: auto; }
`;
