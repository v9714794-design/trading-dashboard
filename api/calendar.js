// 2026 release dates sourced from the official White House/OMB "Schedule of
// Release Dates for Principal Federal Economic Indicators" (published by
// BEA/BLS/Census/Fed via omb.gov), not FRED's API — FRED's releases/dates
// endpoint turned out to only return already-occurred dates, never
// future-scheduled ones, so a verified static calendar is the reliable path
// (same approach already used elsewhere in this dashboard for FOMC dates).
function datesFromMonthDays(name, days) {
  return days
    .map((day, i) => (day ? { name, date: `2026-${String(i + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` } : null))
    .filter(Boolean);
}

const STATIC_EVENTS_2026 = [
  ...datesFromMonthDays("CPI (Consumer Price Index)", [13, 11, 11, 10, 12, 10, 14, 12, 11, 14, 10, 10]),
  ...datesFromMonthDays("PPI (Producer Price Index)", [14, 12, 12, 14, 13, 11, 15, 13, 10, 15, 13, 15]),
  ...datesFromMonthDays("Employment Situation (NFP)", [9, 6, 6, 3, 8, 5, 2, 7, 4, 2, 6, 4]),
  ...datesFromMonthDays("Retail Sales", [15, 17, 16, 16, 14, 17, 16, 14, 16, 15, 17, 16]),
  ...datesFromMonthDays("Industrial Production", [16, 18, 16, 16, 15, 15, 17, 18, 18, 16, 17, 16]),
  ...datesFromMonthDays("Housing Starts", [21, 18, 17, 17, 19, 16, 17, 18, 17, 20, 18, 17]),
  ...datesFromMonthDays("Personal Income & Outlays (PCE)", [29, 26, 27, 30, 28, 25, 30, 26, 30, 29, 25, 23]),
  ...datesFromMonthDays("Employment Cost Index", [30, null, null, 30, null, null, 31, null, null, 30, null, null]),
  { name: "GDP (2Q'26, second estimate)", date: "2026-08-26" },
  { name: "GDP (2Q'26, third estimate)", date: "2026-09-30" },
  { name: "GDP (3Q'26, advance estimate)", date: "2026-10-29" },
  { name: "GDP (3Q'26, second estimate)", date: "2026-11-25" },
  { name: "GDP (3Q'26, third estimate)", date: "2026-12-23" },
];

// Which FRED series backs each event's "Previous" reading, and how to read
// it (plain level, YoY %, or month-over-month change) — matches the same
// transforms used elsewhere in this dashboard so the numbers are consistent.
const PREVIOUS_SOURCE = {
  "CPI (Consumer Price Index)": { id: "CPIAUCSL", kind: "yoy", suffix: "%" },
  "PPI (Producer Price Index)": { id: "PPIACO", kind: "level", suffix: "" },
  "Employment Situation (NFP)": { id: "PAYEMS", kind: "mom_change", suffix: "K" },
  "Retail Sales": { id: "RSAFS", kind: "level_billions_from_millions", suffix: "" },
  "Industrial Production": { id: "INDPRO", kind: "level", suffix: "" },
  "Housing Starts": { id: "HOUST", kind: "level_thousands", suffix: "K" },
  "Personal Income & Outlays (PCE)": { id: "PCE", kind: "level_trillions", suffix: "" },
};

async function fetchPrevious(apiKey, source) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", source.id);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", source.kind === "yoy" ? "14" : "2");

  const r = await fetch(url.toString());
  if (!r.ok) return null;
  const data = await r.json();
  const obs = (data.observations || []).filter((o) => o.value !== ".");
  if (obs.length < 2) return null;

  if (source.kind === "yoy") {
    if (obs.length < 13) return null;
    const now = parseFloat(obs[0].value);
    const prior = parseFloat(obs[12].value);
    return `${(((now - prior) / prior) * 100).toFixed(1)}${source.suffix}`;
  }
  if (source.kind === "mom_change") {
    const diff = parseFloat(obs[0].value) - parseFloat(obs[1].value);
    return `${diff > 0 ? "+" : ""}${Math.round(diff)}${source.suffix}`;
  }
  if (source.kind === "level_billions_from_millions") {
    return `$${(parseFloat(obs[0].value) / 1000).toFixed(1)}B`;
  }
  if (source.kind === "level_trillions") {
    return `$${(parseFloat(obs[0].value) / 1000).toFixed(2)}T`;
  }
  if (source.kind === "level_thousands") {
    return `${(parseFloat(obs[0].value) / 1000).toFixed(2)}M`;
  }
  return `${parseFloat(obs[0].value).toFixed(1)}${source.suffix}`;
}

export default async function handler(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const upcoming = STATIC_EVENTS_2026
    .filter((e) => e.date >= today && e.date <= future)
    .sort((a, b) => a.date.localeCompare(b.date));

  const seen = new Set();
  const events = [];
  for (const e of upcoming) {
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    events.push(e);
    if (events.length >= 14) break;
  }

  const apiKey = process.env.FRED_API_KEY;
  if (apiKey) {
    await Promise.all(
      events.map(async (e) => {
        const source = PREVIOUS_SOURCE[e.name];
        if (!source) return;
        try {
          const previous = await fetchPrevious(apiKey, source);
          if (previous != null) e.previous = previous;
        } catch {
          // leave e.previous unset if the fetch fails — no big deal, still show the date
        }
      })
    );
  }

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({
    events,
    source: "static-2026-omb-schedule",
    note: "Forecast/consensus figures require a paid data license (Bloomberg/Trading Economics/Econoday) and aren't included — 'Previous' is the real last actual reading, live from FRED.",
  });
}
