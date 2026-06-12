# Third-party licenses

demoframe itself is MIT licensed (see LICENSE). It bundles or depends on the
following third-party components:

## Fonts (embedded in rendered output)

- **Inter** by Rasmus Andersson, via `@fontsource/inter`.
  SIL Open Font License 1.1. License text: node_modules/@fontsource/inter/LICENSE
  and https://github.com/rsms/inter/blob/master/LICENSE.txt
- **JetBrains Mono** by JetBrains, via `@fontsource/jetbrains-mono`.
  SIL Open Font License 1.1. License text: node_modules/@fontsource/jetbrains-mono/LICENSE
  and https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt

The OFL permits embedding these fonts in rendered images and videos.

## Binaries

- **ffmpeg** via `ffmpeg-static`: prebuilt ffmpeg binaries licensed under the
  GPLv3 (https://www.ffmpeg.org/legal.html). The binary is invoked as a
  separate process; demoframe does not link against it. Distributions that
  cannot ship GPL binaries should install ffmpeg themselves and remove the
  ffmpeg-static dependency.
- **gifski** (optional, user-installed, not distributed with demoframe):
  AGPL-3.0. Invoked as a separate process when found on PATH.
- **Chromium** via Playwright's browser distribution: BSD-style Chromium
  license. Downloaded explicitly by the user via `demoframe install-browser`,
  not shipped in this package.

## Libraries

- **playwright-core**: Apache-2.0
- **sharp**: Apache-2.0 (bundles libvips, LGPLv3)
- **commander**, **zod**, **yaml**: MIT
- **@shikijs/core**, **@shikijs/engine-javascript**, **@shikijs/langs**,
  **@shikijs/themes**: MIT. Bundled TextMate grammars and themes carry their
  upstream licenses, listed per grammar/theme in the shiki repository
  (https://github.com/shikijs/shiki).
