// Vercel Hobby functions default to a 10s execution limit, but can be raised
// up to 60s — GDELT genuinely takes 8-15s to respond sometimes, so we need
// real headroom here rather than retrying inside a too-short window.
export const config = { maxDuration: 30 };

const REGIONS = {
  "Middle East": ["israel", "gaza", "iran", "middle east", "houthi", "hezbollah", "lebanon", "syria"],
  "Russia / Ukraine": ["russia", "ukraine", "kremlin", "moscow", "putin", "zelensky"],
  "United States": ["united states", "washington", "federal reserve", "white house", " u.s.", "trump", "congress"],
  "Europe": ["europe", " eu ", "ecb", "germany", "france", " uk ", "britain", "eurozone"],
  "Asia-Pacific": ["china", "taiwan", "japan", "asia", "beijing", "korea", "india"],
};

// GDELT's edge often drops requests from cloud/datacenter IPs (like Vercel's)
// that arrive without a browser-like User-Agent — that showed up earlier as
// a raw "TypeError: fetch failed". Separately, GDELT can just be slow
// (8-15s+), so we give it one attempt with a generous timeout rather than
// a short timeout with a retry that only compounds the wait.
async function fetchGdelt(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TapeDashboard/1.0; +https://vercel.com)",
        Accept: "application/json",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  try {
    const query = encodeURIComponent(
      '(war OR conflict OR sanctions OR "central bank" OR inflation OR geopolitical OR recession OR tariffs OR ceasefire)'
    );
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=20&format=json&sort=hybridrel&timespan=24h`;

    const r = await fetchGdelt(url);
    if (!r.ok) throw new Error(`GDELT request failed with status ${r.status}`);
    const data = await r.json();

    const articles = (data.articles || []).slice(0, 15).map((a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      seendate: a.seendate,
      tone: a.tone,
    }));

    const tones = articles.map((a) => parseFloat(a.tone)).filter((t) => !Number.isNaN(t));
    const avgTone = tones.length ? tones.reduce((s, t) => s + t, 0) / tones.length : 0;

    const volumeScore = Math.min(articles.length / 20, 1) * 50;
    const toneScore = Math.max(0, Math.min(1, (-avgTone + 5) / 10)) * 50;
    const riskScore = Math.round(volumeScore + toneScore);

    const regionRisk = Object.entries(REGIONS).map(([region, keywords]) => {
      const count = articles.filter((a) =>
        keywords.some((kw) => (a.title || "").toLowerCase().includes(kw))
      ).length;
      const level = count >= 5 ? "High" : count >= 2 ? "Medium" : "Low";
      return { region, count, level };
    });

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
    res.status(200).json({
      articles,
      riskScore,
      avgTone: avgTone.toFixed(2),
      count: articles.length,
      regionRisk,
    });
  } catch (err) {
    res.status(502).json({ error: "Unexpected error fetching news", detail: String(err) });
  }
}
