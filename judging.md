# Next Gen track scoring (The Bag)

Scored against the four Next Gen criteria in `winners.md`, **excluding RevenueCat integration and video production**. Eligibility (student / `.edu`) is a gate, not a score.

## Initial scores (2026-09-14, pre-this-pass)

Judged against the web prototype as it stood after local JSON + `localStorage` Bag Check, **before** README, Playbook tools, share card, Saver deck expansion, and content split.

| Criterion | Score | Notes |
| --- | --- | --- |
| 1. Idea: clear, useful, original | **8 / 10** | Persistent Ledger / Bag Check vs BitLife is a real thesis. Surface still read as a card life-sim until those systems were explained. |
| 2. Meaningful progress toward a working app | **7 / 10** | Full loop existed (quiz → cards → receipts → moving Bag Score → Bag Check). Vite phone-shell, not Expo. ~2 type cards per Money Type. Playbooks were badges. Share was a toast. |
| 3. Thoughtful RevenueCat use | **1.5 / 10** | Family Plan CTA stub only. *Excluded from the rescore below.* |
| 4. Technical choices, product thinking, care | **5 / 10** | local JSON + persist matched “no backend for a demo.” No README, no LICENSE, content mixed into one JSX file, little architecture commentary. |
| **Overall (all four axes)** | **5.5 / 10** | Idea and loop were ahead of repo/care and far ahead of RevenueCat. |

### Suggested remediations at that time

**P0**

- Wire a real RevenueCat sandbox purchase (excluded from this pass by request).
- README + LICENSE for a judge skim.
- Confirm student eligibility.

**P1**

- 2-minute shot list; polish only that path.
- Playbooks as tools (extra option on a later card), 2–3 unlocks.
- Bag Score in one sentence on Ledger + README.
- Real share card (`navigator.share` / download), not a toast.
- 8–12 Saver cards for the filmed Money Type.
- Split content JSON vs UI.

**P2**

- Comments on Money Type → deck, Ledger persist, Bag Check calendar.
- Do not spend time on production paywall, settings, or a hosted backend.

## What this pass changed

- [`README.md`](README.md) — one-minute overview, four systems, file map, `npm run dev`, shot list; Bag Score sentence; sandbox purchases called out as unwired.
- Shot list path is **Saver**: quiz first answers → First Job (research + Playbook) → Credit Card **Use Playbook** → Ledger → Bag Check share PNG.
- Playbook **tools** (not stickers):
  - `paycheckBasics` → extra option on First Credit Card (`m17`)
  - `readingLease` → extra option on Roommate Ghosts (`w4`)
  - `emergencyFund` → extra option on Car Trouble (`w1`)
- Ledger copy: “Smart choices add points; avoidant or impulse choices subtract. 300–850, like a credit score.”
- [`shareCard.js`](shareCard.js) draws a receipt PNG; Share uses Web Share or file download.
- Saver deck: 10 hand-authored cards in [`content/game.json`](content/game.json); Saver draws in authored order.
- Content moved out of [`TheBagApp.jsx`](TheBagApp.jsx) into `content/game.json` + `content.js`.
- Short comments on Money Type → deck, Ledger persist, Bag Check calendar.

## Current scores (this pass, RevenueCat and video excluded)

Criterion 3 is omitted. Overall is the mean of 1, 2, and 4.

| Criterion | Score | Why it moved |
| --- | --- | --- |
| 1. Idea: clear, useful, original | **8.5 / 10** | Carry-forward Playbook tools make “not BitLife” mechanical, not just copy. Still needs the README/shot list for a cold judge. |
| 2. Meaningful progress toward a working app | **8.5 / 10** | Demo loop is deterministic and filmable; receipts, score, one Playbook unlock, a later tool option, dated Bag Check, real share card, persist. Still a web prototype, not a device app. Other Money Types remain thin (on purpose). |
| 4. Technical choices, product thinking, care | **7.5 / 10** | README, JSON content split, local calendar, documented Bag Score, comments. Still one large UI file, no LICENSE, no Zustand/Expo — acceptable for a demo if the README says so. |
| **Overall (criteria 1, 2, 4)** | **8.2 / 10** | |

If criterion 3 were still in the average with **1.5**, overall would be about **6.5 / 10**. RevenueCat remains the largest gap versus the Next Gen brief; it was left out of this work on purpose.
