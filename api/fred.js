export default async function handler(req, res) {
  const { series, transform } = req.query;

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
    if (transform === "yoy") {
      // Year-over-year % change — needs this month + same month a year ago,
      // plus the prior month's pair too, so we can tell whether the YoY rate
      // itself is accelerating (trend) rather than just up/down on the index.
      const url = new URL("https://api.stlouisfed.org/fred/series/observations");
      url.searchParams.set("series_id", series);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("file_type", "json");
      url.searchParams.set("sort_order", "desc");
      url.searchParams.set("limit", "16");

      const fredRes = await fetch(url.toString());
      if (!fredRes.ok) {
        const text = await fredRes.text();
        res.status(fredRes.status).json({ error: "FRED request failed", detail: text });
        return;
      }
      const data = await fredRes.json();
      const obs = (data.observations || []).filter((o) => o.value !== ".");
      if (obs.length < 13) {
        res.status(404).json({ error: `Not enough observations for ${series} to compute YoY` });
        return;
      }

      const yoyAt = (i) => {
        if (i + 12 >= obs.length) return null;
        const now = parseFloat(obs[i].value);
        const prior = parseFloat(obs[i + 12].value);
        return ((now - prior) / prior) * 100;
      };

      const yoyLatest = yoyAt(0);
      const yoyPrev = yoyAt(1);

      let trend = "flat";
      if (yoyPrev != null) {
        if (yoyLatest > yoyPrev) trend = "up";
        else if (yoyLatest < yoyPrev) trend = "down";
      } else if (obs.length >= 2) {
        // Not enough history to compare YoY-over-YoY — fall back to the raw
        // month-over-month index direction so the UI never gets stuck.
        const diff = parseFloat(obs[0].value) - parseFloat(obs[1].value);
        if (diff > 0) trend = "up";
        else if (diff < 0) trend = "down";
      }

      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      res.status(200).json({
        series,
        value: yoyLatest.toFixed(2),
        prevValue: yoyPrev != null ? yoyPrev.toFixed(2) : null,
        trend,
        date: obs[0].date,
        transform: "yoy",
      });
      return;
    }

    if (transform === "mom_change") {
      // The raw month-over-month CHANGE in level (e.g. jobs added/lost),
      // not the % growth rate — this is what "Non-Farm Payrolls" means in
      // headlines/trading contexts, as opposed to the total employment level.
      const url = new URL("https://api.stlouisfed.org/fred/series/observations");
      url.searchParams.set("series_id", series);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("file_type", "json");
      url.searchParams.set("sort_order", "desc");
      url.searchParams.set("limit", "3");

      const fredRes = await fetch(url.toString());
      if (!fredRes.ok) {
        const text = await fredRes.text();
        res.status(fredRes.status).json({ error: "FRED request failed", detail: text });
        return;
      }
      const data = await fredRes.json();
      const obs = (data.observations || []).filter((o) => o.value !== ".");
      if (obs.length < 2) {
        res.status(404).json({ error: `Not enough observations for ${series} to compute change` });
        return;
      }

      const changeAt = (i) => {
        if (i + 1 >= obs.length) return null;
        return parseFloat(obs[i].value) - parseFloat(obs[i + 1].value);
      };

      const changeLatest = changeAt(0);
      const changePrev = changeAt(1);

      let trend = "flat";
      if (changePrev != null) {
        if (changeLatest > changePrev) trend = "up";
        else if (changeLatest < changePrev) trend = "down";
      }

      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      res.status(200).json({
        series,
        value: changeLatest.toFixed(0),
        prevValue: changePrev != null ? changePrev.toFixed(0) : null,
        trend,
        date: obs[0].date,
        transform: "mom_change",
      });
      return;
    }

    if (transform === "accel") {
      // Is the period-over-period growth RATE accelerating or decelerating —
      // not just whether the level went up or down (a growing economy's
      // level rises almost every quarter regardless, so that alone can't
      // distinguish "healthy expansion" from "slowing toward stall speed").
      const url = new URL("https://api.stlouisfed.org/fred/series/observations");
      url.searchParams.set("series_id", series);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("file_type", "json");
      url.searchParams.set("sort_order", "desc");
      url.searchParams.set("limit", "4");

      const fredRes = await fetch(url.toString());
      if (!fredRes.ok) {
        const text = await fredRes.text();
        res.status(fredRes.status).json({ error: "FRED request failed", detail: text });
        return;
      }
      const data = await fredRes.json();
      const obs = (data.observations || []).filter((o) => o.value !== ".");
      if (obs.length < 2) {
        res.status(404).json({ error: `Not enough observations for ${series} to compute growth rate` });
        return;
      }

      const rateAt = (i) => {
        if (i + 1 >= obs.length) return null;
        const now = parseFloat(obs[i].value);
        const prior = parseFloat(obs[i + 1].value);
        return ((now - prior) / prior) * 100;
      };

      const rateLatest = rateAt(0);
      const ratePrev = rateAt(1);

      let trend = "flat";
      if (ratePrev != null) {
        if (rateLatest > ratePrev) trend = "up";
        else if (rateLatest < ratePrev) trend = "down";
      }

      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      res.status(200).json({
        series,
        value: rateLatest.toFixed(2),
        prevValue: ratePrev != null ? ratePrev.toFixed(2) : null,
        trend,
        date: obs[0].date,
        transform: "accel",
      });
      return;
    }

    const url = new URL("https://api.stlouisfed.org/fred/series/observations");
    url.searchParams.set("series_id", series);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", "2");

    const fredRes = await fetch(url.toString());
    if (!fredRes.ok) {
      const text = await fredRes.text();
      res.status(fredRes.status).json({ error: "FRED request failed", detail: text });
      return;
    }

    const data = await fredRes.json();
    const [latest, previous] = data.observations || [];

    if (!latest) {
      res.status(404).json({ error: `No observations found for series ${series}` });
      return;
    }

    const value = latest.value === "." ? null : latest.value;
    const prevValue = previous && previous.value !== "." ? previous.value : null;

    let trend = "flat";
    if (value != null && prevValue != null) {
      const diff = parseFloat(value) - parseFloat(prevValue);
      if (diff > 0) trend = "up";
      else if (diff < 0) trend = "down";
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({
      series,
      value,
      prevValue,
      trend,
      date: latest.date,
      units: data.units || undefined,
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected error calling FRED", detail: String(err) });
  }
}
