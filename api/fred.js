export default async function handler(req, res) {
  const { series } = req.query;

  if (!series) {
    res.status(400).json({ error: "Missing required query param: series (e.g. ?series=FEDFUNDS)" });
    return;
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "FRED_API_KEY is not set in this project's environment variables" });
    return;
  }

  try {
    const url = new URL("https://api.stlouisfed.org/fred/series/observations");
    url.searchParams.set("series_id", series);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", "1");

    const fredRes = await fetch(url.toString());
    if (!fredRes.ok) {
      const text = await fredRes.text();
      res.status(fredRes.status).json({ error: "FRED request failed", detail: text });
      return;
    }

    const data = await fredRes.json();
    const latest = data.observations?.[0];

    if (!latest) {
      res.status(404).json({ error: `No observations found for series ${series}` });
      return;
    }

    const value = latest.value === "." ? null : latest.value;

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({
      series,
      value,
      date: latest.date,
      units: data.units || undefined,
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected error calling FRED", detail: String(err) });
  }
}
