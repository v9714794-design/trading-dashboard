// api/news.js
// Vercel serverless function: pulls recent high-impact global news from GDELT
// (a free, no-key global news database) and turns it into:
//  - a headline list
//  - a simple 0-100 "geopolitical risk" score based on news volume + tone
//  - a rough regional risk snapshot based on keyword mentions
// This is a derived heuristic, not an official index (e.g. not the GPR Index).

const REGIONS = {
  "Middle East": ["israel", "gaza", "iran", "middle east", "houthi", "hezbollah", "lebanon", "syria"],
  "Russia / Ukraine": ["russia", "ukraine", "kremlin", "moscow", "putin", "zelensky"],
  "United States": ["united states", "washington", "federal reserve", "white house", " u.s.", "trump", "congress"],
  "Europe": ["europe", " eu ", "ecb", "germany", "france", " uk ", "britain", "eurozone"],
  "Asia-Pacific": ["china", "taiwan", "japan", "asia", "beijing", "korea", "india"],
};

export default async function handler(req, res) {
  try {
    const query = encodeURIComponent(
      '(war OR conflict OR sanctions OR "central bank" OR inflation OR geopolitical OR recession OR tariffs OR ceasefire)'
    );
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=20&format=json&sort=hybridrel&timespan=24h`;

    const r = await fetch(url);
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
    res.status(500).json({ error: "Unexpected error fetching news", detail: String(err) });
  }
}
