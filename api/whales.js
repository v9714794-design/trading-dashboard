// Free DIY whale tracker — no paid subscription needed.
// - BTC: blockchain.info's free, keyless API (mempool/pending transactions —
//   the most real-time view available without a paid indexer).
// - ETH: Etherscan's free, self-serve API (requires ETHERSCAN_API_KEY, but
//   the signup itself costs nothing and needs no payment info).
// Same limitations either way: no exchange/entity labels (that attribution
// is exactly what paid Whale Alert sells) — just raw addresses and USD value.
const WHALE_THRESHOLD_USD = 1_000_000;

function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal });
    const status = r.status;
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // leave json null
    }
    return { ok: r.ok, status, json, text: text.slice(0, 300) };
  } catch (err) {
    return { ok: false, status: "fetch_error", error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBtcWhales() {
  const priceRes = await fetchJson("https://blockchain.info/ticker");
  const btcPrice = priceRes.json?.USD?.last;
  if (!btcPrice) {
    return { ok: false, status: priceRes.status, note: "price fetch failed", bodyText: priceRes.text, transactions: [] };
  }

  const txRes = await fetchJson("https://blockchain.info/unconfirmed-transactions?format=json");
  if (!txRes.ok || !txRes.json?.txs) {
    return { ok: false, status: txRes.status, bodyText: txRes.text, transactions: [] };
  }

  const transactions = [];
  for (const tx of txRes.json.txs) {
    const totalSats = (tx.out || []).reduce((s, o) => s + (o.value || 0), 0);
    const usd = (totalSats / 1e8) * btcPrice;
    if (usd >= WHALE_THRESHOLD_USD) {
      transactions.push({
        chain: "bitcoin",
        hash: tx.hash,
        time: new Date((tx.time || Date.now() / 1000) * 1000).toISOString(),
        usd,
        display: fmtUsd(usd),
        pending: true,
      });
    }
  }
  return { ok: true, status: 200, rawCount: txRes.json.txs.length, transactions };
}

async function fetchEthWhales(apiKey) {
  const priceRes = await fetchJson(`https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${apiKey}`);
  const ethPrice = parseFloat(priceRes.json?.result?.ethusd);
  if (!ethPrice) {
    return { ok: false, status: priceRes.status, note: "price fetch failed", bodyText: priceRes.text, transactions: [] };
  }

  const blockNumRes = await fetchJson(`https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`);
  const latestBlockHex = blockNumRes.json?.result;
  if (!latestBlockHex) {
    return { ok: false, status: blockNumRes.status, note: "block number fetch failed", bodyText: blockNumRes.text, transactions: [] };
  }
  const latestBlock = parseInt(latestBlockHex, 16);

  const transactions = [];
  let scannedBlocks = 0;
  // scan the last few blocks — ETH blocks are ~12s apart, so this covers roughly the last minute
  for (let i = 0; i < 5; i++) {
    const blockHex = "0x" + (latestBlock - i).toString(16);
    const blockRes = await fetchJson(
      `https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag=${blockHex}&boolean=true&apikey=${apiKey}`
    );
    const txs = blockRes.json?.result?.transactions;
    if (!Array.isArray(txs)) continue;
    scannedBlocks++;
    for (const tx of txs) {
      const valueEth = parseInt(tx.value, 16) / 1e18;
      const usd = valueEth * ethPrice;
      if (usd >= WHALE_THRESHOLD_USD) {
        transactions.push({
          chain: "ethereum",
          hash: tx.hash,
          time: new Date().toISOString(),
          usd,
          display: fmtUsd(usd),
        });
      }
    }
  }
  return { ok: scannedBlocks > 0, status: 200, scannedBlocks, transactions };
}

export default async function handler(req, res) {
  const btc = await fetchBtcWhales();

  const etherscanKey = process.env.ETHERSCAN_API_KEY;
  const eth = etherscanKey
    ? await fetchEthWhales(etherscanKey)
    : { ok: false, status: "no_key", transactions: [] };

  const transactions = [...btc.transactions, ...eth.transactions].sort((a, b) =>
    (b.time || "").localeCompare(a.time || "")
  );

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    transactions,
    thresholdUsd: WHALE_THRESHOLD_USD,
    ethEnabled: Boolean(etherscanKey),
    debug: {
      btc: { ok: btc.ok, status: btc.status, count: btc.rawCount ?? 0, bodyText: btc.bodyText },
      eth: { ok: eth.ok, status: eth.status, scannedBlocks: eth.scannedBlocks ?? 0, bodyText: eth.bodyText },
    },
  });
}
