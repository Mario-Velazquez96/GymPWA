---
name: Rutinas Gym
description: Un ciclorama de amanecer — bandas negras que amanecen en blanco conforme la rutina se completa.
colors:
  cyc-black: "#050505"
  horizon-cobalt: "#0a33ff"
  horizon-rose: "#ff6aae"
  dawn-rose: "#ffc1d6"
  day-wash: "#f7f5ff"
  day: "#ffffff"
  blackout: "#3a3a3a"
  cue-fault: "#e0342c"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: "36px"
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "1.25"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  subtitle:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "28px"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-strong:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  band: "72px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.horizon-cobalt}"
    textColor: "{colors.day}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "{spacing.touch}"
  button-primary-active:
    backgroundColor: "{colors.dawn-rose}"
    textColor: "{colors.cyc-black}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.day}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "{spacing.touch}"
  button-secondary-hover:
    backgroundColor: "{colors.day}"
    textColor: "{colors.cyc-black}"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.day}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch}"
  button-disabled:
    backgroundColor: "{colors.blackout}"
    textColor: "{colors.day}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch}"
  button-saved:
    backgroundColor: "{colors.day}"
    textColor: "{colors.cyc-black}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch}"
  input-text:
    backgroundColor: "{colors.cyc-black}"
    textColor: "{colors.day}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "{spacing.touch}"
  stepper-value:
    backgroundColor: "transparent"
    textColor: "{colors.day}"
    typography: "{typography.display}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "{spacing.touch}"
  band-night:
    backgroundColor: "{colors.cyc-black}"
    textColor: "{colors.day}"
    padding: "8px 16px"
    height: "{spacing.band}"
  band-day:
    backgroundColor: "{colors.day}"
    textColor: "{colors.cyc-black}"
    padding: "12px 16px"
  band-day-older:
    backgroundColor: "{colors.day-wash}"
    textColor: "{colors.cyc-black}"
    padding: "12px 16px"
  band-blackout:
    backgroundColor: "{colors.blackout}"
    textColor: "{colors.day}"
    padding: "8px 16px"
  band-error:
    backgroundColor: "{colors.cyc-black}"
    textColor: "{colors.cue-fault}"
    padding: "12px 16px"
  nav-tab:
    backgroundColor: "{colors.cyc-black}"
    textColor: "{colors.day}"
    typography: "{typography.body-strong}"
    height: "{spacing.touch}"
---

# Design System: Rutinas Gym

## Overview

**Creative North Star: "The Dawn Cyclorama"**

The app is a black theater cyclorama at night with a lit horizon on it. There is
no depth, no glass, no card floating over anything: content is a stack of
full-bleed horizontal bands on an absorbing matte black (#050505), and the only
lit material in the world is a single vertical cobalt-to-rose gradient — the
horizon. Light is the state machine. A band that has not happened is night; a
band in progress carries a 3 px slice of horizon; a band that is done is full
white day with black ink on it. Saving a set is literally a sunrise: the white
half of a hard-stop gradient rises through the row in 200 ms.

The density is operational, not editorial. Mario reads this one-handed, between
sets, with sweaty hands, under gym light that reflects off the screen — so
numerals are the largest type on any screen, touch targets never go below 44 px,
and every phase carries a word ("Guardada", "Guardando…", "Pendiente", "Sin
conexión") next to its color. High contrast is the aesthetic, not a concession
to it: white on the black ground measures 20.4:1, and no text over the horizon
falls below 4.5:1 because white is kept off the pure rose.

Confirmed rejections, carried by the build: no webfont and no imported display
face; no shadows, blur, or glass; no second gradient that reads as a gradient;
no radius above 6 px; no dark-card-with-neon-accent list, which is the category
look this redesign replaced.

**Key Characteristics:**
- Full-bleed horizontal bands on #050505, stacked, separated by 1 px blackout rules.
- One gradient in the world: the cobalt-to-rose horizon, reserved for structure and the single primary action.
- Three-phase vocabulary — night, dawn, day — mapped to real task state.
- Flat by construction: zero shadows; depth is tonal (black / blackout / day-wash / day).
- Numerals are the protagonists: tabular, 700–800, 22–30 px.
- 44 px minimum on every interactive box; 72 px as the list band unit.
- CSS-only 200 ms dawn sweep; `prefers-reduced-motion` makes it a cut.

## Colors

Eight values, all of them phase vocabulary: a black ground, the two horizon
lights, one softened rose for touch feedback, two whites for what is finished,
one gray for what is off, one red for a failed cue.

### Primary
- **Cobalt Horizon** (#0a33ff): top of the single gradient. Never used as a flat fill; it exists as the upper half of the horizon band, the primary button, and the 3 px active edge.
- **Rose Gather** (#ff6aae): bottom of the same gradient, plus the focus outline (2 px at 2 px offset), the caret color, and the selection background. Never a background for small text — white is kept off pure rose by composition.

### Secondary
- **Dawn Rose** (#ffc1d6): the one-step-lit press state. A primary button under `:active` drops the gradient and becomes flat dawn rose with black ink, so a press reads as light gained rather than opacity lost. Also the marker and emphasis color for list bullets, ordered-list markers, and inline code on night.

### Tertiary
- **Cue Fault** (#e0342c): error only, always on black and always beside text (4.6:1 at 16 px 600). It frames a failed row with a 2 px border and colors the alert line and the "not taken" supplement mark.

### Neutral
- **Cyclorama Black** (#050505): the ground of the world — `html`/`body`, every screen, the fixed header and tab bar, and the browser surfaces (`theme_color`, `background_color`, `color-scheme: dark`). Also the ink on any day-phase surface.
- **White Day** (#ffffff): what is finished and complete — a saved set row, the most recent history session, an open eating window, a checked checklist row, the selected unit in the kg/lb toggle. Body copy on night runs at 90% of it; secondary and disabled text at 60%.
- **Day Wash** (#f7f5ff): the step below full day. Older (non-latest) history sessions, so "done a while ago" sits under "done most recently" without leaving the day phase.
- **Blackout** (#3a3a3a): off, not broken — disabled controls, the offline banner, hairline rules and dividers, and the placeholder plate behind exercise media.

### Named Rules
**The One Horizon Rule.** The cobalt-to-rose gradient is the only gradient in the world that reads as a gradient, and only one horizon is lit per screen: the day band, the active row's 3 px edge, and exactly one primary button. Two lit horizons on one screen is a bug. (The hard-stop `to top, white 50%, transparent 50%` inside the dawn sweep is a position mask, not a visible gradient, and does not count against this rule; neither does the same two-color horizon laid horizontally, which is what a 3 px tall edge requires because a vertical ramp there would render as one flat color.)

**The Never-By-Color-Alone Rule.** No state is signalled by color alone. Every phase carries a word, a shape, or both: "Guardar serie" to "Guardando…" to "Guardada", `aria-pressed` on the unit toggle, `role="status"` / `role="alert"` on async states, a 2 px cue-fault frame plus an alert line on error, `line-through` on a checked row.

**The Day-Is-Earned Rule.** Full white is reserved for what is saved and complete. Nothing decorative may be white-on-black at full luminance — exercise thumbnails from the catalog ship on white plates and are held at 75% opacity in night and dawn precisely so they cannot impersonate the day phase; they return to full light only when the band itself is day.

## Typography

**Display Font:** none imported — the platform sans stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto`).
**Body Font:** the same stack. There is exactly one family in the system.
**Label/Mono Font:** the same stack for labels; a monospace stack appears only for env-var names on the configuration-error screen.

**Character:** A single system sans doing all roles, separated by weight, size, and numeral treatment rather than by family. No webfont ships: the app loads on mobile data inside a gym, and the type budget went to size and contrast instead. Every number that can be compared vertically is `tabular-nums`.

### Hierarchy
- **Display** (800, 30px/36px, tabular): the weight and reps values in the stepper and the plan target "4 × 8-12". The largest thing on any screen is always a number.
- **Headline** (700, 24px, 1.25): screen titles in a screen header — the exercise name, "Historial", "Dieta", "Iniciar sesión".
- **Title** (700, 22px/28px): the plan-day title inside the horizon band — the one string the app is opened to read.
- **Subtitle** (700, 18px/28px): section headings ("Registro de series", "Instrucciones", "Comidas") and the per-band "S × R" and history set lines, tabular where numeric.
- **Body** (400/600, 16px/24px, 90% white on night): instructions, state lines, "Anterior: X kg × Y", and exercise names in a band at 600/20px.
- **Caption** (400, 14px, 60% white): macro sub-lines, supplement notes, the offline banner, meal notes.
- **Label** (700, 12px/16px, 0.08em tracking, uppercase): form labels, the app-name strip, macro tile labels, dates, section group names, table headers, and the zero-padded order numeral. The uppercase and the tracking come from CSS; the DOM keeps sentence case.

### Named Rules
**The Numeral-First Rule.** In any row that carries a measurement, the numeral outranks its label in size and weight, and it is tabular. Weight, reps, sets, macros, dates, and counts all align in a column when stacked.

**The One-Family Rule.** No webfont and no second family may be added without an approved spec. New roles are cut from weight (400/600/700/800), size, and the 0.08em tracking — never from a new face.

## Layout

A single centered column, 448 px max (`max-w-md`), `min-h-dvh`, on the black ground. At 390 px it is the full screen and nothing about the design changes; at desktop widths the header strip, the content, and the fixed tab bar all align to that same 448 px column while their black backgrounds stay full-bleed. Content is never boxed: sections are full-width bands with 16 px side gutters and 8–12 px vertical padding, separated by 1 px blackout dividers or a 1 px black gap between day bands.

The rhythm is 4 / 8 / 12 / 16 / 24 px. The list unit is a **72 px band** — 8 px vertical padding around a 56 px thumbnail — and the one band whose name needs a third line is allowed to grow to 76 px rather than shrink 16 px body text. The app shell is a 44 px black header strip on top and a fixed bottom tab bar padded by `env(safe-area-inset-bottom)`, with 96 px reserved at the bottom of every screen so the bar never covers the last row. Primary actions sit low, within thumb reach.

Every interactive box is at least 44 × 44 px, and opposing controls (minus and plus, save and add) are pushed to opposite ends of their row. Steppers stack one per line because weight and reps do not both fit in 358 px of usable width.

### Named Rules
**The 44 Rule.** Nothing tappable is under 44 px in either axis, in any state, including disabled. Sweaty hands and gloves are the design constraint, not an edge case.

## Elevation & Depth

There are no shadows in this system — not one `box-shadow`, no blur, no backdrop-filter, no glass. Depth is purely tonal and temporal: a surface is placed by how much light it has (black, blackout, day-wash, full day) and by whether it carries a piece of the horizon. The 3 px horizon edge is the closest thing to elevation in the world: it does not lift a band, it marks the one band that is live.

### Named Rules
**The No-Shadow Rule.** A cyclorama has no cast shadows. Separation comes from a 1 px blackout hairline, a 1 px black gap, or a change of phase — never from a drop shadow, a glow, or a blur.

**The Horizon-Edge Rule.** The 3 px gradient edge means exactly one thing: this is the live one. Left edge for a row or band — the active set row, the most recent history session, an exercise with sets logged today, the open eating window. Top edge for the active bottom-nav tab. A saved or finished band never carries it.

## Shapes

Rectangles, everywhere. Corners are 4 px on every control — buttons, steppers, inputs, thumbnails, checkbox boxes, tags — with a single 6 px exception on the square exercise media frame. Nothing in the system is pill-shaped or circular. Bands themselves are unrounded and full-bleed; only the objects inside them have corners.

Borders carry meaning by weight: **2 px** is a control's own outline in the color of its phase (day white when lit, blackout when off, cue-fault when failed, `currentColor` on stepper parts so they invert with their band), while **1 px blackout** is a structural hairline between bands. The focus ring is a 2 px rose outline at 2 px offset, applied globally to `:focus-visible`.

## Components

### Buttons
Three tiers, the same 44 px rectangle and 4 px corner throughout; what changes is how much light the button is given.
- **Shape:** 4 px corners, 44 px minimum height, 700 weight, 16 px label.
- **Primary (horizon):** the horizon gradient with white text, 24 px horizontal padding. One per screen — on the Exercise screen it belongs to the active set row only. Pressed, it drops the gradient entirely and goes flat Dawn Rose with black ink: a step of light, not a fade.
- **Secondary (day border):** transparent with a 2 px white border and white text; hover and press fill white with black ink. Carried by pending writes that are not the active row, the day-navigation arrows, the back control, and the unit toggle's unselected side.
- **Tertiary (quiet):** the same bordered rectangle at 60% opacity, for actions that only navigate or add ("Agregar serie", "Ver historial"), so a non-committal action can never be mistaken for a write.
- **Disabled (blackout):** blackout fill and blackout border, text at 60% white, `cursor-not-allowed`, still 44 px. Opacity is never used alone to express disabled on a primary.
- **Saved (day):** white fill, black ink, 2 px black border, `cursor-default`, label "Guardada".
- **Transitions:** color only, 150 ms, and every transition is paired with a reduced-motion escape.

### Inputs / Fields
- **Style:** black fill, 2 px border at 60% white, 4 px corners, 44 px tall, 16 px white text, with a 12 px uppercase tracked label above.
- **Focus:** the border switches to Rose Gather over 150 ms; the global 2 px rose focus outline also applies.
- **Stepper field:** the value itself is the input — a 44 px tappable 30 px/800 tabular number bordered in `currentColor`, which becomes a decimal-mode text field with a rose border while editing. The decrement and increment controls are 44 px squares bordered in `currentColor`, so they are white on a night row and black on a risen row with no extra prop. A saved value is never dimmed: the number is the record.
- **Error:** the row is framed in a 2 px cue-fault border and an alert line in cue-fault text is added; entered values are never cleared.

### Cards / Containers
There are no cards. The container primitive is a **band**: full-bleed, square-cornered, 16 px gutters, 8–12 px vertical padding, phase-colored (night black, blackout, day-wash, day white), separated by 1 px blackout dividers or a 1 px black gap. Collapsible groups are a band with top and bottom hairlines and a 44 px summary row whose marker rotates 90 degrees on open.

### Navigation
- **App header:** a 44 px black strip with a bottom blackout hairline, the app name as a 12 px uppercase tracked label on the left and a plain underlined text action on the right, both inside the 448 px column.
- **Bottom tabs:** fixed, black, safe-area padded, two equal 44 px tabs at 16 px/700. Active = full white text plus the 3 px horizon top edge; inactive = 60% white, hovering to full.
- **Day navigation:** two 44 px secondary squares pinned to the ends of the horizon band, vertically centered so white sits at mid-gradient (5.1:1) and never on pure rose; at a plan boundary they go blackout.

### Signature Component: the sunrise row
Any band that can complete is built as a sunrise row: a black background carrying a hard-stop `to top, white 50%, transparent 50%` gradient at 200% height, parked at the bottom position. Switching it to the day position moves the background position to the top and flips the ink to black — the white half rises through the band in 200 ms on `cubic-bezier(0.16, 1, 0.3, 1)`, taking `color` and `border-color` with it. It costs no JavaScript, no canvas, and no repaint of the tree. Under `prefers-reduced-motion: reduce` the transition is removed and the change is a cut; an element that mounts already in day does not animate. It ships on saved set rows, checked checklist rows, the open eating window, and a completed exercise band.

### Phase vocabulary
- **Night** (black ground, white ink): not started, pending, before the eating window, and the whole of an untouched screen.
- **Dawn** (black ground plus the 3 px horizon edge): in progress — the active set row, the most recent session, an exercise with sets logged today, the open window.
- **Day** (white or day-wash, black ink): saved and complete.
- **Blackout** (#3a3a3a): off — disabled controls, an offline snapshot, a closed eating window.
- **Cue fault** (#e0342c on black, always with text): a failed write or load.

## Do's and Don'ts

### Do:
- **Do** build new surfaces as full-bleed horizontal bands on #050505 inside the 448 px column, not as cards.
- **Do** map every new state onto the existing phase vocabulary — night, dawn (3 px horizon edge), day, blackout, cue-fault — instead of inventing a new color.
- **Do** keep exactly one lit horizon per screen: the structural band, the active edge, and one primary button.
- **Do** give every state a word or a shape in addition to its color, and keep the status, alert, and pressed roles on async and toggle states.
- **Do** make numerals tabular, 700–800, and larger than their labels (30 px/800 for entry values, 22 px/700 for the day title).
- **Do** hold every interactive box at 44 px minimum in both axes, in every state including disabled, and keep opposing actions at opposite ends of their row.
- **Do** express a completion as a 200 ms CSS-only sunrise and pair every transition with a reduced-motion escape.
- **Do** keep corners at 4 px (6 px only on the media frame), 2 px borders for controls, 1 px blackout for structure.

### Don't:
- **Don't** add a second visible gradient, a glow, a blur, glass, or any `box-shadow`; depth is tonal only.
- **Don't** put white or small text on pure Rose Gather, and don't use the rose as a background for body copy.
- **Don't** spend full white on anything that is not saved and complete — decorative or imported white imagery is held below full luminance until its band is day.
- **Don't** signal a state by color alone, and don't express disabled with opacity alone on a primary action; use blackout fill, blackout border, and 60% text.
- **Don't** import a webfont or a second family, and don't shrink 16 px body copy to make a layout fit — grow the band instead.
- **Don't** let a navigational or additive action wear the primary horizon; it gets the 60% bordered tertiary rectangle.
- **Don't** exceed a 6 px corner radius or introduce pill or circular shapes.
- **Don't** add new controls whose icon is a typed text character, and don't add a decorative label above a heading; new iconography ships as inline SVG at 16–24 px, and the 12 px tracked label is for real labels, dates, and metadata.
