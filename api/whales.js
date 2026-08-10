// Free DIY whale tracker — no paid Whale Alert subscription. Uses
// Blockchair's free tier (1,000 calls/day, no key needed) to pull recent
// on-chain transactions above a USD threshold for BTC and ETH.
// Limitations, by design (see disclaimer sent to the client too):
// - No exchange/entity labels ("from Binance") — just raw wallet addresses,
//   since that kind of attribution is exactly what paid Whale Alert sells.
// - Only reflects transactions since the last poll, not a continuous feed.
const WHALE_THRESHOLD_USD = 1_000_000;

function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

async function fetchChain(chain, usdField) {
  const url = `https://api.blockchair.com/${chain}/transactions?q=${usdField}(%3E${WHALE_THRESHOLD_USD})&s=time(desc)&limit=10`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    const status = r.status;
    if (!r.ok) return { chain, ok: false, status, transactions: [] };
    const data = await r.json();
    const rows = data.data || [];
    const transactions = rows.map((tx) => ({
      chain,
      hash: tx.hash,
      time: tx.time,
      usd: tx[usdField],
      display: fmtUsd(tx[usdField]),
    }));
    return { chain, ok: true, status, transactions, rawCount: rows.length };
  } catch (err) {
    return { chain, ok: false, status: "fetch_error", error: String(err), transactions: [] };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const [btc, eth] = await Promise.all([
    fetchChain("bitcoin", "output_total_usd"),
    fetchChain("ethereum", "value_usd"),
  ]);

  const transactions = [...btc.transactions, ...eth.transactions].sort((a, b) =>
    (b.time || "").localeCompare(a.time || "")
  );

  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");
  res.status(200).json({
    transactions,
    thresholdUsd: WHALE_THRESHOLD_USD,
    debug: { btc: { ok: btc.ok, status: btc.status, count: btc.rawCount ?? 0 }, eth: { ok: eth.ok, status: eth.status, count: eth.rawCount ?? 0 } },
  });
}
