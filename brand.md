# Brand — Mizan

**ميزان — the balance, the scales.**

_Status: active_

**Swiss editorial.** Paper, ink, vermillion, saffron, stone. Large type, hard colour
blocks, flat fills. No gradients and no shadows anywhere in the system.

The rule that makes it work: **colour always does a job, and the same hue never means
two things.**

| Hue | Job |
| --- | --- |
| **ink** | you, your account, the primary action |
| **vermillion** | money leaving, and the live state |
| **saffron** | a settled event |
| **stone** | every neutral surface and line |

Avatars are stone, never tinted — an avatar colour would be a hue doing no job.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#FAF9F5` | App ground |
| `--paper-2` | `#F2F0E9` | Page ground behind the app |
| `--ink` | `#111110` | Text, balance block, primary button |
| `--ink-2` | `#5C5A54` | Secondary text |
| `--ink-3` | `#8A877E` | Tertiary text, eyebrows |
| `--stone` | `#EAE8E1` | Neutral fills |
| `--hairline` | `#DCD9D0` | Every rule and border |
| `--vermillion` | `#E03A17` | Fills and display type **only** |
| `--vermillion-text` | `#8F2308` | The same job at body size — `#E03A17` is 4.2:1 on paper and fails AA below 18px |
| `--vermillion-tint` | `#FBE2DB` | Outgoing transaction marker |
| `--saffron` | `#FFC300` | Fill only — never text on paper |
| `--saffron-deep` / `--saffron-mid` | `#3D2E00` / `#5C4700` | Text on saffron |

Light only. `prefers-color-scheme: dark` is explicitly overridden back to light — this
gets shown on a projector and printed for judges, and a dark theme is a consumer signal
working against the direction.

## Typography

Bundled, not fetched, so venue wifi cannot break the demo:

- **Inter** 400/500 — everything
- **IBM Plex Sans Arabic** 400/500 — the wordmark
- **IBM Plex Mono** 400 — addresses and digests

Type gets big and it gets tight: headings at weight 500 with `-0.035em` tracking. Timid
type is what makes a colourful design look amateur. Amounts use `tabular-nums`.

Eyebrows are 11px, `.09em` tracking, uppercase, `--ink-3`.

## Geometry

Radius 6px (controls, avatars), 8px (blocks). 4px spacing scale. Hairline borders do the
separating work — never a shadow, never both a border and a shadow.

## Two surfaces that are deliberately not this

Both are scoped so nothing leaks in either direction — no token above is used by
either, and neither defines anything the app can see.

- **The account chooser** (`.gsi-`, `styles/chooser.css`) is Google's layout, type and
  greys. At the moment someone is asked to trust a screen, a familiar one beats an
  original one.
- **The wallet** (`.tw-`, `styles/wallet.css`) is dark, round-cornered and filled,
  because that is what a wallet looks like and because it has to read as a separate
  thing you opened rather than another Mizan panel. It is the one place shadows-free
  dark fills and a blue accent are allowed, and the blue does exactly one job there —
  the action you can take.
