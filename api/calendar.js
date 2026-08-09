const WATCHLIST = [
  "Consumer Price Index",
  "Employment Situation",
  "Gross Domestic Product",
  "Personal Income and Outlays",
  "Producer Price Index",
  "Advance Monthly Sales for Retail and Food Services",
  "Industrial Production and Capacity Utilization",
  "New Residential Construction",
  "University of Michigan",
  "Employment Cost Index",
];

export default async function handler(req, res) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "FRED_API_KEY is not set in this project's environment variables" });
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // NOTE: realtime_start/realtime_end on this endpoint control FRED's
    // data-revision "vintage" window, NOT which future release dates come
    // back — leaving them out (API defaults to today) and filtering the
    // returned dates ourselves is the reliable way to get an upcoming list.
    const url = new URL("https://api.stlouisfed.org/fred/releases/dates");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("include_release_dates_with_no_data", "false");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", "1000");

    const r = await fetch(url.toString());
    if (!r.ok) {
      res.status(200).json({ events: [], warning: `FRED responded with status ${r.status}` });
      return;
    }

    const data = await r.json();
    const dates = data.release_dates || [];

    const upcoming = dates
      .filter((d) => d.date >= today && d.date <= future)
      .sort((a, b) => a.date.localeCompare(b.date)); // soonest first, so the dedupe below keeps each release's NEXT date, not its latest one in the window
    const matched = upcoming.filter((d) =>
      WATCHLIST.some((w) => (d.release_name || "").toLowerCase().includes(w.toLowerCase()))
    );

    const seen = new Set();
    const events = [];
    for (const d of matched) {
      if (seen.has(d.release_name)) continue;
      seen.add(d.release_name);
      events.push({ name: d.release_name, date: d.date });
      if (events.length >= 12) break;
    }
    events.sort((a, b) => a.date.localeCompare(b.date));

    res.setHeader("Cache-Control", "no-store");
    if (events.length === 0) {
      // Temporary diagnostics so we can see exactly what FRED returned if
      // the watchlist match (or date filter) still comes up empty.
      res.status(200).json({
        events,
        debug: {
          checkedAt: new Date().toISOString(),
          codeVersion: "desc-v2",
          today,
          future,
          totalDatesReturned: dates.length,
          upcomingInWindow: upcoming.length,
          sampleNames: [...new Set(upcoming.slice(0, 20).map((d) => d.release_name))],
          firstFewRawDates: dates.slice(0, 5).map((d) => d.date),
          lastFewRawDates: dates.slice(-5).map((d) => d.date),
        },
      });
      return;
    }
    res.status(200).json({ events });
  } catch (err) {
    res.status(200).json({ events: [], warning: String(err) });
  }
}
