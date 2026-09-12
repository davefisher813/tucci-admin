# DESIGN SYSTEM (v6, LOCKED)
Values below are read from `src/app/globals.css` and `tailwind.config.ts`.

## Colors (light)

| Token | Hex | Use |
|---|---|---|
| ink | #0A0A0A | primary text, dark fills |
| text | #0A0A0A | body text (`color: var(--text)`) |
| sky | #7DC4E8 | secondary brand |
| accent | #1E78A6 | primary actions, links, default booking color |
| gold | #F5C518 | highlights |
| bg | #F4F6F9 | page background |
| paper | #FFFFFF | cards |
| muted | #3A3F4D | secondary text |
| line | #E5E9EF | borders |
| line-2 | #D8DDE5 | stronger borders |
| success | #10B981 | success only |
| danger | #DC2626 | critical states only |

CSS variables: `--ink --text --sky --accent --gold --bg --paper --muted --line --line-2 --success --danger`. Note the hyphen in `--line-2`; Tailwind exposes it as `line-2`.

## Dark theme

`[data-theme="dark"]` overrides `--bg #000000`, `--paper #1C1C1E`, `--line rgba(255,255,255,.09)`, `--line-2 rgba(255,255,255,.16)`, `--text #FFFFFF`, `--muted #98989F`, `--accent #7DC4E8`. Tailwind `darkMode` is the selector `[data-theme="dark"]`. The root layout currently hardcodes `data-theme="light"` (`src/app/layout.tsx`).

## Typography

Archivo for display, DM Sans for body, loaded from Google Fonts in `globals.css`. Tailwind: `font-display`, `font-body`. CSS: `--fd`, `--fs`, helper classes `.fd` and `.tnum` (tabular numerals). Body weight 500. Title Case app-wide.

Anything referencing Inter, Barlow, or #0B2A3D is from an older version. None remain in `src/`. Replace on sight if they reappear.

## Rows and lists (Mindbody-style calm)

- One bold line (name), one muted detail line, one quiet status cue, chevron.
- One bold element per row.
- Minimal color, reserved for the one actionable number.
- Tabular numerals for numbers (`.tnum`).
- KPI strip at top of list screens (`KpiCard`); sticky headers; designed empty states.

## Edit affordances

Every schedule and calendar object is editable inline and via modal: appointments, cage and space lanes, coach assignments, times. `EditBookingModal` is series-aware.

## Facility Map

Source of truth in code: the `LANES` constant in `src/components/admin/FacilityMap.tsx` ("approved v6 map"). Layout: Gym plus Cages 1 through 7 (splittable top and bottom), lanes 8 and 9 (outdoor bullpen, not splittable), Field 1 spans the top row, Field 2 the bottom row. Cage 2 carries TrackMan, Cage 3 HitTrax. Booked lanes grey out live in New Booking. The original `facility_map_reference.html` is not in the repo. (unverified)

## Schedule

Desktop: column grid. Phone: Agenda by default with a Grid toggle (`ScheduleGrid.tsx:149-150`, toggle at `569-591`). Block-off tiles render with a stripe pattern and show the block label from notes (`ScheduleGrid.tsx:885-889`). Other tiles use `booking_types.color`.

## Responsive

Check 390 width for every change; reception works from a phone.

## Mockups

Come only from Dave's uploads. Do not generate new mockups unprompted.
