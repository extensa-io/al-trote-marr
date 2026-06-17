# Design

A clean, minimal, mobile-first running app. The only inheritance from the earlier direction is the colour palette. There is no theme, no motif, and no themed vocabulary. Spend restraint everywhere; let the palette and good typography carry it.

## Palette (tokens in `app/globals.css`)

| token | hex | role |
|---|---|---|
| field | #23261a | app background (warm deep olive, not black) |
| panel | #2e3221 | secondary surfaces |
| raised | #3a3f29 | cards, the focused element |
| line | #4a4f35 | hairlines and borders |
| canvas | #d8cdb0 | primary text |
| canvas-dim | #a39c82 | secondary text, labels |
| brass | #c49a4a | the single accent: primary actions, today, key numbers |
| confirmed | #6e8a4e | done status |
| signal | #a8432e | skipped status, destructive |

Brass is precious. Use it for one thing per view at most, plus status colours where data demands them. Everything else stays in the olive and canvas range.

## Type

- **Display** (Space Grotesk): the wordmark and section headings, used with restraint.
- **Body** (Inter): all reading text.
- **Mono** (JetBrains Mono): every number, so stats and paces read as data with tabular alignment.

Set a clear scale. Labels and eyebrows are uppercase with wide tracking via the `.eyebrow` class. Sentence case everywhere else.

## Layout and components

- Single-column, thumb-reachable, max width around 28rem centred.
- Cards: `raised` background, `line` border, `rounded-md`, generous padding. The day's focused card gets a brass border.
- Status reads through colour and a short label, not icons-as-decoration.
- A bottom tab bar for Today, Plan, Dashboard once there is more than one screen.

## Copy

Plain verbs, sentence case, no filler. A button says what it does and keeps that word through the flow (a "Log run" button leads to a "Run logged" confirmation). Empty states say what to do next. Errors say what happened and how to fix it, never apologise, never go vague.

## Quality floor

Responsive to 360px, visible keyboard focus, `prefers-reduced-motion` respected, adequate contrast against the dark field. Animation is optional and quiet; a subtle state transition beats scattered effects.
