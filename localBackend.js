import bagCheckContent from "./content/bagCheck.json" with { type: "json" };

const STORAGE_KEY = "the-bag-demo";

const { scenarios, calendar } = bagCheckContent;

export function getDateKey(demoOffset = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Number(demoOffset || 0));
  return d.toISOString().slice(0, 10);
}

function dayOfYear(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = Date.UTC(year, 0, 0);
  const now = Date.UTC(year, month - 1, day);
  return Math.floor((now - start) / 86400000);
}

function scenarioById(id) {
  return scenarios.find((s) => s.id === id) || null;
}

/** Bag Check calendar: date-keyed JSON in content/bagCheck.json so every client would get the same card that UTC day. */
export function getTodayBagCheck(demoOffset = 0) {
  const dateKey = getDateKey(demoOffset);
  const fromCalendar = scenarioById(calendar[dateKey]);
  if (fromCalendar) return { dateKey, scenario: fromCalendar };
  const fallback = scenarios[dayOfYear(dateKey) % scenarios.length];
  return { dateKey, scenario: fallback };
}

export function makeBagCheckState(saved = null) {
  const demoOffset = saved?.demoOffset ?? 0;
  const { dateKey, scenario } = getTodayBagCheck(demoOffset);
  const answeredDate = saved?.answeredDate ?? null;
  const answeredToday = answeredDate === dateKey;
  return {
    demoOffset,
    dateKey,
    scenario,
    answeredDate,
    answeredToday,
    chosenSide: answeredToday ? saved.chosenSide : null,
    justAnswered: false,
    history: saved?.history ?? [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or private-mode failures should not break the demo.
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
