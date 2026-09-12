disposition: fix

# Finish review - 14_ui_redesign_cyclorama (code-led, world: stagecraft-theater-lighting-cyclorama-dawn)

Reviewer inputs: the four captures in .impeccable/review/, both QB cards, the direction contract (.impeccable/surfaces/src-screens-todayscreen-tsx.md), PRODUCT.md, progress/impl_14_ui_redesign_cyclorama.md, src/index.css, TodayScreen.tsx, ExerciseCard.tsx, SetRow.tsx, Stepper.tsx, BottomNav.tsx, AppHeader.tsx, the craft floor. Pixels sampled with System.Drawing (PIL and ImageMagick absent).
Not read / not captured: reference/operate.md; the spec files; Historial, Dieta, Login screens; no capture shows a saved (day) set row or an exercise in dawn/day phase, so the signature dawn state and the History/Diet day bands are judged from CSS only, never from a render. Build state, spec.json and diff reports do not exist and are not expected on a code-led build.

## persistence

pass.
- PRODUCT.md exists (schema 1, interview evidence dated 2026-09-12).
- Code-led build: no .impeccable/build/state.json, no .impeccable/mocks/, no hero-repro.png; none is owed, no comp round ran, no approval record is owed. .impeccable/config.local.json, questions/, surfaces/ present.
- New world: DESIGN.md absence is not a finding (documenter runs after this review).
- Contract FORM carries seed key eee43132, matching the seed the packet quotes for the direction roll.

## fidelity

No approved comp; TYPE, MATERIAL and GROUND judged against OWN-WORLD; the element inventory against FIRST VIEWPORT. Captures: Hoy 390 (mobile.png, 390x889), Ejercicio 390 (mobile-ejercicio.png), Hoy 1440, Ejercicio 1440.

| Element | Verdict | Evidence |
|---|---|---|
| TYPE (display: system sans 700, text-2xl "Hoy", 22 px screen titles, text-3xl 800 tabular numerals, 12 px 0.08em kickers) | match (contract) | Decision D and the contract "Unresolved decisions" block forbid importing the QB stencil; system sans is the contract choice. The floor line on system display faces is overridden by the pinned brief; recorded, not a fix. |
| MATERIAL (flat matte #050505, single vertical cobalt-to-rose gradient, 2 px borders, radius 2 px, no shadow/glass) | match | No faked physicality anywhere: no bevel, no emboss, no glow. Gradient used only as band/primary/edge (--background-image-horizon; theme.test.ts forbids others). |
| GROUND (#050505 named by OWN-WORLD) | match | Sampled: Hoy list (5,5,5), Ejercicio (5,5,5), desktop field and column (5,5,5). Neutral, no warm or slate drift. Divider sample (58,58,58) = blackout. |
| App header 44 px black, RUTINAS GYM kicker, "Cerrar sesion" right | match | AppHeader.tsx, capture. |
| Horizon band ~96 px cobalt-to-rose | match | min-h-24; sampled top (24,54,251), mid (134,79,214), bottom (246,104,177). |
| Band title = "titulo del dia 22 px 700" | adaptation, cited (spec R9 approved by the human 2026-09-12) | Build: <h1>Hoy 24 px + date kicker in the band; the plan-day title "Torso - empuje" is an 18 px night <h2> below. Judgment: the reading order does not serve the task. "Hoy" is already the active tab label in the same viewport, so the 24 px focal line of the band carries zero information, and the one string Mario opens the app for (what is today) is demoted to the dimmest band on screen. Ordered as fix 4; the human can waive it because the spec cites it. |
| Arrows < > as 44 px white 2 px squares at the band ends | match | Glyph-as-text is decision E (recorded, no fix). |
| Exercise bands 72 px, order kicker 01..., thumb 56, name 16/600, "S x R" 18 tabular | match in geometry; contradicted in legibility | 5 of 8 names truncate with an ellipsis at 390 ("Press de banca con ...", "Press sentado con ...", "Pullover con mancu...", "Elevacion lateral co...", "Extension de triceps..."). truncate is a builder choice, not the contract; Operate mode forbids expression obscuring the task. Fix 1. |
| Thumbnails (white-ground GIF frames) | contradicted (OWN-WORLD: "Dia blanco solo para lo guardado y completo") | Sampled (244,244,244): eight pure-white 56 px tiles are the brightest elements of the first viewport, brighter than the horizon band, and read as eight "day" states on rows that are all night. Fix 3. |
| Row phases (night / dawn edge / day) on Hoy | adaptation, cited (decision C-1, zero new queries) | All rows data-phase="night"; THESIS/STORY "las filas hechas ya son de dia" deferred to a later feature. Recorded, not a fix. |
| Bottom bar fixed black, Hoy/Dieta 44 px, active with 3 px top horizon edge | match | horizon-edge-t, left-to-right gradient. The 3 px horizon-edge-* stripes are contract-required; the floor side-stripe line is overridden. |
| Exercise header: 44 px back square + 22 px title | match | |
| Focal numerals "4 x 12-20" 30 px 800 + "Descanso: 120 s" at 60 pct | match | |
| Tag chips, note box (rose 2 px border, 16 px body) | match | Rose is a border, never a text ground. |
| Set row: "Serie N" + "Anterior" right, stacked steppers with 2 px currentColor boxes, value text-3xl 800 | match (stacking cited: 358 px cannot hold both side by side) | |
| Active row 3 px left horizon edge | match | Visible on Serie 1. |
| Primary "Guardar serie" = horizon with white text | contradicted in distribution | OWN-WORLD assigns the horizon to "banda del dia, accion primaria y fila activa". Four identical horizon slabs stack in one viewport (rows 1-4 all editable), so the signature material becomes a repeating pattern and no single lit action leads the thumb. Fix 2. |
| kg/lb toggle: active = day white with black ink, inactive = bordered | match | |
| Secondary "Agregar serie" / "Ver historial" white 2 px border | match | |
| Row hover hover:bg-blackout | contradicted (state vocabulary) | blackout is the disabled token (#3A3A3A). iOS sticky hover paints the row Mario just tapped in the disabled colour while the route changes. Fix 5. |
| Desktop 1440: content column 448 px centred; header brand and "Cerrar sesion" at the screen edges | contradicted (composition, secondary viewport) | Header and content do not share a column; the brand sits about 1000 px from the content. Fix 7. |
| Dawn sweep (200 ms background-position over a hard 50 pct gradient, --ease-sweep, prefers-reduced-motion -> transition: none) | match per CSS, unverified in render | No capture holds a saved row. |
| Browser surfaces (color-scheme: dark, ::selection rose/black, caret rose, accent-color cobalt, :focus-visible rose 2 px) | match | |
| Content added without approval | none | Copy frozen; real plan data, no synthetic or commercial claims. |

## ceiling

Not reached. Native devices of the world the build leaves unused (commitment and finish, never composition):
- The phase ladder. The whole voice of the QB is the stepped series Blackout, Cobalt Rise, Rose Gather, Dawn Bloom, Day Wash, White Out. The build ships two states (night, day) plus one gradient; --color-dawn-rose and --color-day-wash are declared and appear on no captured screen (Day Wash only on older History sessions per the report).
- Pressed/active states as a phase step. The QB PRIMARY active is the same button one phase lighter (dawn rose ground, dark ink); the primary pressed state in the build is hover:opacity-90, a fade, which is the category default, not the world.
- The horizon as a top strip on a band (QB card "normal"): the day-title <h2> sits as a bare night line under the horizon band; the world would let a 3 px strip or the band edge tie the title to the horizon.
- Motion: one authored moment (the sweep) is right; the animate-pulse on "Cargando rutina..." is the generic default rather than a blackout-to-cobalt cue.

## material_fixes

1. Task legibility (Operate; FIRST VIEWPORT "nombre 16 px 600"): 5 of 8 exercise names truncate at 390. Replace truncate on the name in ExerciseCard.tsx with a two-line clamp (line-clamp-2 leading-5) inside the existing 72 px band (2 x 20 px fits beside the 56 px thumb); keep min-w-0 flex-1. No test asserts truncate.
2. Horizon reserved for the active row (OWN-WORLD "horizonte = ... accion primaria y fila activa"; THESIS focus): in SetRow.tsx render "Guardar serie" as horizon only when active; non-active editable rows use the secondary treatment (border-2 border-day bg-transparent text-day). One lit action per screen; the row that dawns is the one that was lit. Keep the button enabled on every row (affordance unchanged; feature 08 tests unaffected).
3. White thumbnails borrow the "day" state (OWN-WORLD "Dia blanco solo para lo guardado y completo"): in ExerciseCard.tsx drop the tile below the luminance of the band so pure white stays the saved/complete signal: opacity-75 on the <img> for night/dawn rows (full opacity on day), or a bg-blackout 56 px tile with the frame inset to 48 px. The Ejercicio hero GIF stays full white (it is the focal there).
4. Band reading order (FIRST VIEWPORT "titulo del dia ... en la banda"; STORY "se que toca"): put the plan-day title in the band as the 22 px 700 line and carry "HOY - LUN 14 SEP" as the tracked 12 px line beneath it; keep <h1>Hoy as the accessible heading (visually hidden, or as the first word of that line) so the pre-existing heading contract holds. This changes only the R9/R10 tests this build added, not any pre-existing structural assert. Spec-cited adaptation: the human may waive it; if waived, record the waiver in the spec.
5. Hover state uses the disabled token (OWN-WORLD state vocabulary): ExerciseCard hover:bg-blackout -> a night-adjacent value scoped to pointer devices ([@media(hover:hover)]:hover:bg-day/10), so iOS sticky hover never paints a tapped row as disabled. Arrow hover (hover:bg-day) and disabled (disabled:bg-blackout) are correct and stay.
6. Pressed state as a phase step (ceiling): primary buttons (bg-horizon) get active:bg-none active:bg-dawn-rose active:text-cyc-black instead of hover:opacity-90; same pressed step on the band arrows. Uses the declared, currently unused dawn-rose token; no new colour.
7. Desktop header column (secondary viewport, R32): wrap the AppHeader contents in mx-auto w-full max-w-md so brand, "Cerrar sesion", content column and tabs share one 448 px column at 1440; the black field stays full-bleed.

Recorded, not fixes: text glyphs (decision E); system sans display (decision D); 3 px horizon-edge-* (contract); 01... order numerals (plan order carries information); Hoy rows all night (C-1); stacked steppers (358 px); "Anterior: 11.34 kg" values (feature 13); 4-column macro tiles (feature 10 R6).

## keep

The horizon band + 2 px-bordered white 30 px numerals on the sampled-true #050505 ground, and the CSS-only 200 ms dawn sweep with reduced-motion cut: apply the seven points above without adding depth, glass, a webfont, or a second gradient.

## verdict pass 1

Scored 2026-09-12 against the recaptured files (mobile.png, mobile-ejercicio.png, desktop.png, desktop-ejercicio.png) plus the four newly captured surfaces (mobile-ejercicio-guardada.png, mobile-historial.png, mobile-dieta.png, mobile-login.png). Evidence check passed on all eight: content matches the filenames, document top visible, dimensions correct (390x2288 / 1440x2220 / 390x5161), no black or blank regions beyond the known fixed-BottomNav artifact. Hover and pressed states cannot appear in a static capture, so fixes 5 and 6 were scored against the built source, which is the artifact on a code-led build.

### verdict

1. Exercise name truncation - **partial**. 7 of 8 names now wrap to two lines and read in full at 390 (compare "Press sentado con mancuerna en banco", "Elevacion lateral con mancuerna", previously clipped). Row 07 still clips: "Extension de triceps / acostado con..." - line-clamp-2 at 16 px / leading-5 is one line short for the longest name in the plan, and the word it drops is the equipment. Remaining gap named below.
2. Horizon reserved for the active row - **resolved**. mobile-ejercicio.png: one horizon slab on Serie 1, "Guardar serie" on Series 2-4 rendered as white 2 px bordered transparent rectangles; same at 1440. mobile-ejercicio-guardada.png confirms the relay: Serie 1 saved, Serie 2 now carries both the horizon slab and the 3 px left edge. The signature material is now singular per screen and tracks the active row.
3. White thumbnails borrowing the day state - **resolved**. Thumb plate sampled at 155,155,155 (was 244,244,244), against the band rose at 241,103,178 and saved-row white at 255,255,255. Pure white is again exclusive to saved/complete; mobile-ejercicio-guardada.png shows the saved row as the only white field on the screen. See regression R2.
4. Band reading order - **unresolved (deferred to human)**. Not applied; it contradicts approved R9/R10 and two exact-structure asserts (TodayScreen.test.tsx:289, :325), and is now a waiver decision in front of the human. Not scored as a build failure.
5. Hover using the disabled token - **resolved**. ExerciseCard.tsx:20-21 night/dawn carry hover:bg-day/10; blackout survives only under disabled: in TodayScreen.tsx:8 and Checklist.tsx:65, where it is correct. The pointer-media scoping I suggested was not used, but the harm named in the finding is gone: iOS sticky hover now leaves a faint day wash, not a disabled gray, on a tapped row.
6. Pressed state as a phase step - **resolved**. active:bg-none active:bg-dawn-rose active:text-cyc-black on every primary (TodayScreen.tsx:12, ExerciseScreen.tsx:18, DietScreen.tsx:62, HistoryScreen.tsx:20, LoginScreen.tsx:90, LoggingSection.tsx:60, SetRow.tsx:26), active:bg-dawn-rose on the band arrows (TodayScreen.tsx:8) and on the new secondary (SetRow.tsx:34), motion-reduce:transition-none kept throughout. The previously dead dawn-rose token is now the pressed phase step; no new colour entered the world.
7. Desktop header column - **resolved**. AppHeader.tsx:16 wraps the contents in mx-auto w-full max-w-md; in desktop.png and desktop-ejercicio.png the brand sits on the content column left edge and "Cerrar sesion" on its right edge, with the black field still full-bleed. 390 unchanged.

### regressions introduced by this batch (2)

R1. Ejercicio at 390 now stacks six identical white-bordered rectangles: "Guardar serie" on Series 2-4 is the same treatment as the section-terminal "Agregar serie" and "Ver historial", so the per-set commit no longer differs from the two non-committal actions below it. Cheapest separation that keeps one lit primary: give the pending saves the day-wash hairline or full-width fill and leave the terminal pair at 60 pct border, or move "Agregar serie" / "Ver historial" to text-with-underline.
R2. Thumbnails went further than the finding required: at opacity-60 the plate measures 155 gray, so the line-art figure loses roughly half its contrast against its own tile on the one surface the brief pins to strong gym light with reflections, where the thumbnail is the fastest recognition cue. opacity-75 (the alternative the fix named) restores the figure while staying far below the saved-row white.

### remaining

- Fix 1, row 07: "Extension de triceps acostado con mancuerna" still clips at 390. Either let the name take three lines (line-clamp-3 with the band free to reach ~76 px) or hold 72 px by setting the name to text-[15px] leading-[18px]; the S x R column can also give back ~12 px, since "3 x 12-15" does not need the width "3 x 30-45 s" reserves.
- Fix 4: waiver decision with the human; no builder action until it returns.
- R1 and R2 above.

disposition: fix

## verdict pass 2

Scored 2026-09-12 against the eight recaptured files. Evidence check passed on all eight: filenames match content, document top visible, dimensions unchanged (390x2288 / 1440x2220 / 390x5161), no black or blank regions beyond the known fixed-BottomNav artifact. Only the four items left open by verdict pass 1 were scored.

### verdict

A. Fix 4, band reading order - **resolved**. The band now reads HOY - LUN 14 SEP as a 12 px tracked kicker over "Torso - empuje" as the 22 px bold protagonist, at both 390 and 1440; the orphan night <h2> is gone and the list starts directly under the band. The plan day is now the largest type in the first viewport, which is what STORY ("se que toca") and FIRST VIEWPORT asked for. Human authorization recorded in requirements.md "Enmienda 1"; the two named asserts were the only ones rewritten. Contrast sampled on the new stack: white kicker over (70,65,236) = 6.5:1, white title over (152,83,209) = 4.7:1, both above the floor for their sizes, and white still never touches the rose.
B. Fix 1, row 07 clipping - **resolved**. All eight names of the real plan read in full at 390 with no ellipsis anywhere; row 07 takes three lines ("Extension de triceps / acostado con / mancuerna") at the same 16 px, so arm-length legibility was held and the width came from the S x R column as suggested. Bands now vary in height with name length, which is the honest consequence of the choice and does not break the horizontal band rhythm.
C. Regression R1, six identical rectangles - **resolved**. Three tiers now read apart at a glance in mobile-ejercicio.png: horizon slab on the active row only, full-strength white bordered "Guardar serie" on the pending rows, and visibly quieter borders and ink on "Agregar serie" / "Ver historial". The commit action no longer shares its treatment with the two terminal actions, and fix 2 single-slab rule is intact.
D. Regression R2, thumbnail too dim - **resolved**. Plate sampled at 192,192,192 (was 155 in round 1, 244 before any fix): the line-art figure has its contrast back while the tile stays clearly short of the saved-row 255 white, so fix 3 state hygiene still holds - white with black ink remains exclusive to saved and complete.

### remaining

clear.

Nothing from the scored list is open; no third round is warranted on these items. This ship covers the four items scored here plus the seven fixes scored in verdict pass 1 - it is not a fresh verdict on surfaces outside that list. The record still carries, unchanged and by explicit decision, the items marked "recorded, not fixes" in the original report (text glyphs, system sans display, 3 px horizon edges, order numerals, all-night rows on Hoy under C-1, stacked steppers), plus the ceiling observations, which are commitment notes for a future round and never blocked this one.

disposition: ship
