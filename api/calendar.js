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

    const url = new URL("https://api.stlouisfed.org/fred/releases/dates");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("realtime_start", today);
    url.searchParams.set("realtime_end", future);
    url.searchParams.set("include_release_dates_with_no_data", "false");
    url.searchParams.set("sort_order", "asc");
    url.searchParams.set("limit", "1000");

    const r = await fetch(url.toString());
    if (!r.ok) {
      res.status(200).json({ events: [], warning: `FRED responded with status ${r.status}` });
      return;
    }

    const data = await r.json();
    const dates = data.release_dates || [];

    const matched = dates.filter((d) =>
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

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).json({ events });
  } catch (err) {
    res.status(200).json({ events: [], warning: String(err) });
  }
}
