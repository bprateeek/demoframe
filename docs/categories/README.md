# demoframe category guidance

Categories affect scaffolding and authoring guidance only. They are not a
runtime schema field.

## Product

Use `screen` scenes for reconstructed product UI. Prefer:

- `app-header` for product identity and the current workspace/state.
- `stat-strip` for 2-4 headline metrics.
- `chart-card` for trend or distribution evidence.
- `card-grid` for feature/status summaries.
- `list` for recent activity, tasks, or ranked items.
- `progress` for completion workflows.
- `callout` for the final outcome.

## Screenshot To Screen

Map source screenshots by intent, not layout:

- Dashboard header -> `app-header`.
- KPI row -> `stat-strip`.
- Table rows -> `list` or `card-grid`.
- Graph -> `chart-card`.
- Score/result panel -> `callout`.
- Checklist or setup flow -> `progress` plus `list`.

Keep one idea per scene. Use `motion: focus` when one block is the money shot,
and `motion: scroll` only for intentionally tall product pages.

## Premium Motion

Use the `premium-hero` template when the demo needs a frameless README or launch
hero before detailed product screens exist. Keep it asset-free, preserve exact
product copy in the brief, and replace placeholder numbers with grounded product
payload before rendering.
