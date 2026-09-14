# The Bag

A life-sim that teaches real money decisions. BitLife makes each life disposable. **The Bag** keeps your financial identity — even when the character ends.

**Bag Score:** smart choices add points; avoidant or impulse choices subtract. It’s 300–850, like a credit score.

## Four systems

1. **Money Type** — 5-question quiz (Saver / Splurger / Freezer / Chaser) that picks which Decision Deck a life draws from.
2. **Decision Decks** — swipeable cards that print a **Receipt** with the real math.
3. **The Ledger** — Bag Score, Playbooks, and past lives. Playbooks are *tools*: unlocking one adds an extra option on a later card.
4. **The Bag Check** — one dated scenario per UTC day, always free, with a shareable receipt card.

## Where it lives

| System | Code |
| --- | --- |
| UI / loop | [`TheBagApp.jsx`](TheBagApp.jsx) |
| Decks, Playbooks, quiz | [`content/game.json`](content/game.json) (loaded by [`content.js`](content.js)) |
| Bag Check calendar | [`content/bagCheck.json`](content/bagCheck.json) via [`localBackend.js`](localBackend.js) |
| Ledger persist | `localStorage` key `the-bag-demo` in `localBackend.js` |
| Share card | [`shareCard.js`](shareCard.js) |

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Use **Reset all progress** in Settings if you need a clean take.

Sandbox purchases are **not wired** in this demo. Settings still opens a Family Plan mock; checkout is a placeholder.

## 2-minute shot list (Saver)

Pick the **first answer** on every quiz question → The Saver. Goal: **Just get better with money**. Name: **Maya**.

| Time | Beat |
| --- | --- |
| 0:00–0:20 | Quiz → Saver reveal |
| 0:20–0:28 | Goal + name Maya, tap through avatar |
| 0:28–0:50 | Age 16 **First Job**: Research → swipe **left** (retail) → Receipt, Playbook unlock |
| 0:50–1:10 | Age 17 **Credit Card**: teal **Use Playbook** (paycheck tool) → Receipt, score jumps |
| 1:10–1:22 | Scroll Ledger: Bag Score sentence + Playbook badge |
| 1:22–1:50 | Bag Check tab → left choice → **Share Result** (PNG) |
| 1:50–2:00 | Hold the share card / Ledger hero number |
