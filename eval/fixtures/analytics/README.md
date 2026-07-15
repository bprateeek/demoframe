# funnelglass

Privacy-first activation funnels for product teams. Funnelglass reads an event
file locally and turns it into a clear stage-by-stage conversion report—no
tracking pixel, no hosted customer profiles.

## Activation funnel

| Stage | People | Conversion |
| --- | ---: | ---: |
| Landing page | 10,000 | 100% |
| Created workspace | 4,210 | 42.1% |
| Invited teammate | 2,470 | 24.7% |

The previous onboarding flow converted 18.4%. The new invite step reaches
**24.7% conversion**, a 6.3 point lift.

```sh
npx funnelglass report events.json --funnel activation
```

Output is deterministic JSON or a local HTML report. Zero cookies, zero
network requests.
