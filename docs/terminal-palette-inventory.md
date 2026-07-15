# Terminal palette inventory (1.0.1 baseline)

This inventory records every terminal-specific literal that existed at the
1.0.0 visual baseline and its 1.0.1 disposition. Product content now follows
the resolved theme. Only physical bezel/shadow treatment and accessible
terminal error/warning roles remain fixed.

| 1.0.0 literal | Former use | 1.0.1 source |
| --- | --- | --- |
| `#11151c` | Terminal/device and embedded playback surface | `--df-screen` |
| `#1a2029` | Terminal chrome and status section | `--df-card` |
| `#161b22` | Terminal metric panel | `--df-card` |
| `#262d38` | Borders | `--df-border`; the outer terminal bezel edge intentionally remains `#262d38` |
| `#8d96a3` | Title, dim output, spinner | `--df-muted` |
| `#d6dde6` | Terminal body text | `--df-text` |
| `#3fb950` | Success output and exit | `--df-success` |
| `rgba(0, 0, 0, 0.35)` | Embedded playback shadow | `--df-shadow` |
| `rgba(0, 0, 0, 0.5)` | Device shadow | Fixed physical frame treatment |
| `#f85149` | Error output and exit | Fixed accessible terminal error role |
| `#d29922` | Warning output | Fixed accessible terminal warning role |

The status-card `#22a04b` success CTA was also replaced by
`--df-success`. White foreground text on filled success/CTA controls remains a
semantic on-color rather than a terminal palette literal.
