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

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ events, source: "static-2026-omb-schedule" });
}
