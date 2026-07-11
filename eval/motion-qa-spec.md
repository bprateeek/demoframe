# Motion-QA detector specification

This is the locked P0 contract for the rendered QA engine. Plain
`demoframe check` never starts Chromium and therefore never runs these
detectors. `preview`, `render`, and the optional `qa` command sample the entire
timeline, not only semantic still timestamps.

## Sampling and common measurements

| Profile | Timeline sample rate | Collision/clip severity | Empty/static severity | Dwell severity | Loop severity |
| --- | ---: | --- | --- | --- | --- |
| `readme-loop` | 15 Hz | error | error | error | error |
| `social-film` | 15 Hz | error | warning | error | not applicable |
| `product-tour` | 12 Hz | error | warning | error | not applicable |

Every sample records the composited frame plus DOM measurements for visible
`data-qa-key` text and object boxes. A text box is readable when its computed
opacity multiplied through its ancestor chain is at least `0.55`, its font size
is at least 10 CSS px, it has non-empty rendered text, and at least 70% of its
area is inside the safe viewport. Pixel comparisons use sRGB frames resized to
64x64, excluding the fixed frame/chrome mask supplied by the renderer.

Findings use stable codes and include profile, first/last timestamp, duration,
involved QA keys, measured value, threshold, and any applied exemption.

## `qa.text-collision`

Collision means two readable text bounding boxes overlap; a crossfade is not an
automatic exemption because two opaque, readable layers are the defect.

- Measurement: pairwise DOM box intersection on each sample. A collision is
  active when intersection width and height are both at least 2 CSS px and the
  intersection covers at least 3% of the smaller box.
- Persistence threshold: two consecutive samples, or one sample covering at
  least 120 ms by interpolation.
- Exemptions: text nodes inside the same declared text block; an explicit
  compositor mask that clips one box to zero readable pixels; accessibility-only
  duplicate text with `aria-hidden=true` and zero painted pixels.
- Severity: error for all profiles.

## `qa.text-dwell`

- Required dwell per durable text block:
  `0.35 seconds + (wordCount / 200 words-per-minute) * 60 seconds`, clamped to
  `[0.8s, 6s]`. Tokens containing a digit, slash, path separator, or code
  punctuation count as 1.35 words.
- Actual dwell: union of timeline intervals where the block stays above 0.55
  opacity and at least 70% inside the safe viewport. Intervals separated by less
  than 100 ms are merged.
- A block fails when actual dwell is less than 90% of required dwell.
- Exemptions: decorative single-character glyphs, persistent frame chrome, and
  exact repeated copy whose immediately preceding interval already satisfied
  dwell and whose gap is below 500 ms.
- Severity: error for all profiles.

## `qa.empty-frame`

Empty frame means meaningful content coverage remains below the profile
threshold for longer than the allowed duration outside an intentional beat.

- Meaningful coverage: union of painted non-background pixels inside QA object
  boxes, divided by the safe viewport area. Ambient fields, grid textures,
  frame chrome, watermark logos, and cursor-only pixels do not count.
- Thresholds: `< 7% for > 400 ms` (`readme-loop`), `< 6% for > 650 ms`
  (`social-film`), `< 8% for > 650 ms` (`product-tour`).
- Exemptions: declared `outro` fade tail up to 300 ms; declared intentional
  negative-space hook up to 450 ms when a durable hook line is visible; the
  first/last 100 ms of a seamless loop.
- Severity: error for `readme-loop`, warning for the other profiles during the
  first detector release. Seeded eval fixtures must still be detected.

## `qa.static-time`

- Per-frame motion score: fraction of unmasked 64x64 pixels whose CIEDE2000
  delta from the prior sample exceeds 2.3, plus normalized QA-box movement.
  Static means changed-pixel fraction `< 0.5%` and every object moves `< 0.5`
  CSS px with scale delta `< 0.2%`.
- Finding windows: static for `> 1.4s` (`readme-loop`), `> 2.0s`
  (`social-film`), or `> 2.5s` (`product-tour`).
- Exemptions: payoff holds, declared outros, and shots using `calm` motion
  personality. An exemption is limited to the declared beat interval and is
  recorded in the report.
- Severity: error for `readme-loop`, warning for the other profiles during the
  first detector release.

## `qa.loop-continuity`

- Applies only to `readme-loop`.
- Compare the median of the first three samples with the median of the last
  three after excluding the first/last 50 ms encoder guard.
- Pass requires perceptual-hash Hamming distance `<= 6`, mean CIEDE2000
  `<= 5`, and no durable QA object whose first/last position differs by more
  than 3 CSS px unless its opacity is below 0.2 at both ends.
- An intentional hard reset is not an exemption for `readme-loop`; author it as
  a social film instead.
- Severity: error.

## `qa.clipping`

- A visible text/object box clips when more than 1 CSS px crosses the safe
  viewport or declared object mask on any side, or when the painted pixel bounds
  cross by more than 2 device pixels.
- Persistence threshold: one sample for durable text, two samples for moving
  non-text objects.
- Exemptions: compositor objects explicitly declared as edge-bleed or masked;
  the exemption never applies to readable text.
- Severity: error for text, warning for non-text during the first detector
  release.

## Promotion rule

Rendered detectors ship as report warnings for one minor release even where
the final table says error. `--strict` blocks atomic output promotion during
that release. Promotion to normal errors requires zero false positives in the
five-fixture eval and the three approved benchmark animatics.
