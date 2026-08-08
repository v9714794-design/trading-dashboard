// Vercel Hobby functions default to a 10s execution limit, but can be raised
// up to 60s — GDELT can take 8-15s+ to respond, so this needs real headroom.
export const config = { maxDuration: 30 };

const REGIONS = {
  "Middle East": ["israel", "gaza", "iran", "middle east", "houthi", "hezbollah", "lebanon", "syria"],
  "Russia / Ukraine": ["russia", "ukraine", "kremlin", "moscow", "putin", "zelensky"],
  "United States": ["united states", "washington", "federal reserve", "white house", " u.s.", "trump", "congress"],
  "Europe": ["europe", " eu ", "ecb", "germany", "france", " uk ", "britain", "eurozone"],
  "Asia-Pacific": ["china", "taiwan", "japan", "asia", "beijing", "korea", "india"],
};

// Vercel's free-tier functions run from a shared, rotating IP pool used by
// many other projects — GDELT rate-limits per IP, so its 429s here are often
// caused by OTHER people's traffic, not just this dashboard's. Two defenses:
// 1) an in-memory last-good-response cache (survives while this function
//    instance stays warm) so a rate-limited request can still serve recent
//    real data instead of an error, and
// 2) one retry with backoff, honoring GDELT's Retry-After header if present.
let lastGood = { data: null, ts: 0 };
const CACHE_FRESH_MS = 5 * 60 * 1000; // serve straight from cache if newer than this
const CACHE_STALE_OK_MS = 60 * 60 * 1000; // fall back to cache-on-error up to this old

async function fetchGdeltOnce(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGdelt(url) {
  let r = await fetchGdeltOnce(url, 15000);
  if (r.status === 429) {
    const retryAfter = parseInt(r.headers.get("retry-after"), 10);
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 3000);
    r = await fetchGdeltOnce(url, 8000);
  }
  return r;
}

export default async function handler(req, res) {
  const now = Date.now();

  if (lastGood.data && now - lastGood.ts < CACHE_FRESH_MS) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ ...lastGood.data, cached: true });
    return;
  }

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

    const payload = {
      articles,
      riskScore,
      avgTone: avgTone.toFixed(2),
      count: articles.length,
      regionRisk,
    };

    lastGood = { data: payload, ts: now };

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
    res.status(200).json(payload);
  } catch (err) {
    // Fall back to a recent-but-not-quite-fresh cached response rather than
    // erroring outright, if we have one.
    if (lastGood.data && now - lastGood.ts < CACHE_STALE_OK_MS) {
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      res.status(200).json({ ...lastGood.data, cached: true, stale: true });
      return;
    }
    res.status(502).json({ error: "Unexpected error fetching news", detail: String(err) });
  }
}
