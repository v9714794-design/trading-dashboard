import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, ResponsiveContainer, YAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, Bitcoin, Landmark,
  CircleDollarSign, Gem, LayoutGrid, Compass, Building2,
  Gauge, Globe2, Newspaper,
} from "lucide-react";

const MACRO_API_BASE = "";

const CRYPTO_IDS = ["bitcoin", "ethereum", "solana", "ripple", "binancecoin", "dogecoin"];
const FX_PAIRS = [
  { label: "EUR/USD", base: "EUR", quote: "USD" },
  { label: "GBP/USD", base: "GBP", quote: "USD" },
  { label: "USD/JPY", base: "USD", quote: "JPY" },
  { label: "USD/CHF", base: "USD", quote: "CHF" },
  { label: "AUD/USD", base: "AUD", quote: "USD" },
  { label: "USD/INR", base: "USD", quote: "INR" },
];
const METALS = [
  { symbol: "XAU", label: "Gold", unit: "oz" },
  { symbol: "XAG", label: "Silver", unit: "oz" },
];

const MACRO_SERIES = [
  { category: "Growth & Output", id: "GDP", label: "GDP (nominal)", placeholder: "$29.0T" },
  { category: "Growth & Output", id: "GDPC1", label: "Real GDP", placeholder: "$23.5T" },
  { category: "Growth & Output", id: "INDPRO", label: "Industrial Production", placeholder: "103.2" },
  { category: "Growth & Output", id: "RSAFS", label: "Retail Sales", placeholder: "$720B" },
  { category: "Growth & Output", id: "PCE", label: "Personal Consumption", placeholder: "$19.8T" },

  { category: "Prices & Inflation", id: "CPIAUCSL", label: "CPI (YoY)", placeholder: "2.7%" },
  { category: "Prices & Inflation", id: "CPILFESL", label: "Core CPI", placeholder: "3.0%" },
  { category: "Prices & Inflation", id: "PPIACO", label: "Producer Price Index", placeholder: "254.1" },
  { category: "Prices & Inflation", id: "M2SL", label: "M2 Money Supply", placeholder: "$21.6T" },

  { category: "Labor & Socioeconomic", id: "UNRATE", label: "Unemployment Rate", placeholder: "4.1%" },
  { category: "Labor & Socioeconomic", id: "PAYEMS", label: "Nonfarm Payrolls", placeholder: "159.5M" },
  { category: "Labor & Socioeconomic", id: "CIVPART", label: "Labor Force Participation", placeholder: "62.5%" },
  { category: "Labor & Socioeconomic", id: "ICSA", label: "Initial Jobless Claims", placeholder: "225K" },
  { category: "Labor & Socioeconomic", id: "MEHOINUSA672N", label: "Median Household Income", placeholder: "$80.6K" },
  { category: "Labor & Socioeconomic", id: "UMCSENT", label: "Consumer Sentiment", placeholder: "68.5" },

  { category: "Housing", id: "HOUST", label: "Housing Starts", placeholder: "1.35M" },
  { category: "Housing", id: "MSPUS", label: "Median Home Sale Price", placeholder: "$420K" },
  { category: "Housing", id: "MORTGAGE30US", label: "30-Yr Mortgage Rate", placeholder: "6.7%" },

  { category: "Rates & Money", id: "FEDFUNDS", label: "Fed Funds Rate", placeholder: "4.33%" },
  { category: "Rates & Money", id: "DGS2", label: "2-Year Yield", placeholder: "4.10%" },
  { category: "Rates & Money", id: "DGS10", label: "10-Year Yield", placeholder: "4.31%" },
  { category: "Rates & Money", id: "T10Y2Y", label: "10Y-2Y Spread", placeholder: "0.21%" },

  { category: "Banking & Liquidity", id: "STLFSI4", label: "Financial Stress Index", placeholder: "-0.30" },
  { category: "Banking & Liquidity", id: "WALCL", label: "Fed Balance Sheet", placeholder: "$6.9T" },
  { category: "Banking & Liquidity", id: "RRPONTSYD", label: "Overnight Reverse Repo", placeholder: "$150B" },
  { category: "Banking & Liquidity", id: "WRESBAL", label: "Bank Reserve Balances", placeholder: "$3.2T" },
  { category: "Banking & Liquidity", id: "SOFR", label: "SOFR (overnight funding)", placeholder: "4.30%" },
];

const MACRO_OVERVIEW_IDS = ["GDP", "GDPC1", "CPIAUCSL", "FEDFUNDS", "DGS10", "T10Y2Y"];
const SOCIO_OVERVIEW_IDS = ["UNRATE", "CIVPART", "PAYEMS", "MEHOINUSA672N", "UMCSENT", "ICSA"];
const MICRO_OVERVIEW_IDS = ["RSAFS", "INDPRO", "PPIACO", "HOUST", "MSPUS", "MORTGAGE30US"];
const BANKS_OVERVIEW_IDS = ["STLFSI4", "WALCL", "RRPONTSYD", "WRESBAL", "SOFR"];

const REGIME_MAP = {
  "Expanding|Cooling": {
    name: "Goldilocks",
    bias: "Historically supportive of risk assets — growth expanding while inflation cools.",
    equities: "Constructive", bonds: "Neutral-to-positive", commodities: "Neutral", usd: "Softer bias",
  },
  "Expanding|Rising": {
    name: "Reflation",
    bias: "Growth expanding alongside rising inflation — cyclicals & real assets often lead.",
    equities: "Selective (cyclicals)", bonds: "Pressured", commodities: "Constructive", usd: "Mixed",
  },
  "Contracting|Rising": {
    name: "Stagflation",
    bias: "The hardest regime — growth slowing while inflation stays sticky.",
    equities: "Defensive", bonds: "Pressured", commodities: "Constructive (esp. gold)", usd: "Firmer bias",
  },
  "Contracting|Cooling": {
    name: "Deflationary Bust",
    bias: "Growth and inflation both falling — classic risk-off, flight to quality.",
    equities: "Defensive", bonds: "Constructive", commodities: "Soft", usd: "Firmer (safe-haven)",
  },
};

function fmtUsd(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function useLivePoll(fetcher, intervalMs, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const savedFetcher = useRef(fetcher);
  savedFetcher.current = fetcher;

  const run = useCallback(async () => {
    try {
      const result = await savedFetcher.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message || "failed to load");
    }
  }, []);

  useEffect(() => {
    run();
    if (!intervalMs) return;
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, refresh: run };
}

function Sparkline({ points, color }) {
  if (!points || points.length < 2) {
    return <div style={{ height: 40, fontSize: 11, color: "var(--text-muted)" }}>building tape…</div>;
  }
  const data = points.map((p, i) => ({ i, v: p }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <YAxis domain={["dataMin", "dataMax"]} hide />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Pill({ up, children }) {
  return (
    <span className={`pill ${up ? "pill-up" : "pill-down"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {children}
    </span>
  );
}

function SectionLabel({ children, eyebrow }) {
  return (
    <div className="section-label">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{children}</h2>
    </div>
  );
}

function TrendArrow({ trend }) {
  if (trend === "up") return <span style={{ color: "var(--up)" }}>▲</span>;
  if (trend === "down") return <span style={{ color: "var(--down)" }}>▼</span>;
  return <span style={{ color: "var(--text-muted)" }}>▬</span>;
}

function OverviewGrid({ title, ids, macroData }) {
  return (
    <>
      <div className="macro-cat">{title}</div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        {ids.map((id) => {
          const m = macroData?.find((x) => x.id === id);
          return (
            <div className="card" key={id}>
              <div className="card-title">{m ? m.label : id}</div>
              <div className="card-value">
                {m ? m.value : "…"} {m && <TrendArrow trend={m.trend} />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function TapeApp() {
  const [tab, setTab] = useState("overview");
  const [history, setHistory] = useState({});

  const pushHistory = useCallback((key, value) => {
    setHistory((h) => {
      const prev = h[key] || [];
      const next = [...prev, value].slice(-40);
      return { ...h, [key]: next };
    });
  }, []);

  const crypto = useLivePoll(async () => {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(",")}&sparkline=true&price_change_percentage=24h`
    );
    if (!res.ok) throw new Error("crypto feed unavailable");
    const json = await res.json();
    json.forEach((c) => pushHistory(`crypto:${c.id}`, c.current_price));
    return json;
  }, 30000, []);

  const metals = useLivePoll(async () => {
    const results = await Promise.all(
      METALS.map(async (m) => {
        const res = await fetch(`https://api.gold-api.com/price/${m.symbol}`);
        if (!res.ok) throw new Error("metals feed unavailable");
        return res.json();
      })
    );
    results.forEach((r) => pushHistory(`metal:${r.symbol}`, r.price));
    return results;
  }, 45000, []);

  const forex = useLivePoll(async () => {
    const res = await fetch("https://api.frankfurter.dev/v2/latest?base=USD");
    if (!res.ok) throw new Error("forex feed unavailable");
    const json = await res.json();
    return json.rates;
  }, 5 * 60000, []);

  const macro = useLivePoll(async () => {
    const results = await Promise.all(
      MACRO_SERIES.map(async (s) => {
        try {
          const res = await fetch(`${MACRO_API_BASE}/api/fred?series=${s.id}`);
          if (!res.ok) throw new Error("no proxy");
          const json = await res.json();
          return { ...s, value: json.value ?? s.placeholder, trend: json.trend ?? "flat", live: true };
        } catch {
          return { ...s, value: s.placeholder, trend: "flat", live: false };
        }
      })
    );
    return results;
  }, 0, []);

  const news = useLivePoll(async () => {
    const res = await fetch("/api/news");
    if (!res.ok) throw new Error("news feed unavailable");
    return res.json();
  }, 10 * 60000, []);

  const btc = crypto.data?.find((c) => c.id === "bitcoin");
  const xau = metals.data?.find((m) => m.symbol === "XAU");
  const xag = metals.data?.find((m) => m.symbol === "XAG");
  const eurusd = forex.data ? 1 / forex.data.EUR : null;

  const tickerItems = [
    btc && `BTC $${fmtUsd(btc.current_price, 0)}`,
    crypto.data?.find((c) => c.id === "ethereum") && `ETH $${fmtUsd(crypto.data.find((c) => c.id === "ethereum").current_price, 0)}`,
    xau && `XAU $${fmtUsd(xau.price, 2)}`,
    xag && `XAG $${fmtUsd(xag.price, 2)}`,
    eurusd && `EUR/USD ${eurusd.toFixed(4)}`,
    forex.data && `USD/JPY ${forex.data.JPY?.toFixed(2)}`,
  ].filter(Boolean);

  const macroByCategory = {};
  (macro.data || []).forEach((m) => {
    if (!macroByCategory[m.category]) macroByCategory[m.category] = [];
    macroByCategory[m.category].push(m);
  });

  // ---- Regime / bias logic ----
  const gdp = macro.data?.find((m) => m.id === "GDPC1");
  const cpi = macro.data?.find((m) => m.id === "CPIAUCSL");
  const fedFunds = macro.data?.find((m) => m.id === "FEDFUNDS");
  const curve = macro.data?.find((m) => m.id === "T10Y2Y");

  const growthState = gdp?.trend === "up" ? "Expanding" : gdp?.trend === "down" ? "Contracting" : null;
  const inflationState = cpi?.trend === "up" ? "Rising" : cpi?.trend === "down" ? "Cooling" : null;
  const regimeKey = growthState && inflationState ? `${growthState}|${inflationState}` : null;
  const regime = regimeKey ? REGIME_MAP[regimeKey] : null;

  const curveInverted = curve && parseFloat(curve.value) < 0;
  const fedStance = fedFunds?.trend === "up" ? "Tightening (hawkish)" : fedFunds?.trend === "down" ? "Easing (dovish)" : "Holding steady";
  const globalBias = curveInverted
    ? "Risk-Off tilt — yield curve inverted"
    : fedFunds?.trend === "down"
      ? "Risk-On tilt — policy easing"
      : fedFunds?.trend === "up"
        ? "Cautious — policy tightening"
        : "Neutral / data-dependent";

  // ---- Sentiment composite ----
  const cryptoBreadthPct = crypto.data?.length
    ? Math.round((crypto.data.filter((c) => c.price_change_percentage_24h >= 0).length / crypto.data.length) * 100)
    : null;
  const btcMomentum = btc?.price_change_percentage_24h ?? 0;
  const umcsent = macro.data?.find((m) => m.id === "UMCSENT");
  const umcsentScore = umcsent ? Math.max(0, Math.min(100, parseFloat(umcsent.value))) : 50;
  const momentumScore = Math.max(0, Math.min(100, 50 + btcMomentum * 3));
  const sentimentScore = cryptoBreadthPct != null
    ? Math.round((cryptoBreadthPct + momentumScore + umcsentScore) / 3)
    : null;
  const sentimentLabel = sentimentScore == null ? "…" : sentimentScore < 40 ? "Fear / Risk-Off" : sentimentScore > 60 ? "Greed / Risk-On" : "Neutral";

  return (
    <div className="tape-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
        .tape-root { --bg:#0b0e11; --panel:#12161c; --panel-hi:#171c24; --border:#232a34; --text:#e8e6e1; --text-muted:#7a8290; --amber:#f0a202; --up:#3ecf8e; --down:#ff5c5c; font-family:'Space Grotesk',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; max-width:480px; margin:0 auto; padding-bottom:76px; position:relative; }
        .mono { font-family:'IBM Plex Mono',monospace; }
        .ticker-wrap { background:#000; border-bottom:1px solid var(--border); overflow:hidden; white-space:nowrap; padding:7px 0; }
        .ticker-track { display:inline-block; animation:scroll-left 22s linear infinite; }
        .ticker-track span { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--amber); margin-right:28px; letter-spacing:0.02em; }
        @keyframes scroll-left { 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
        .app-header { display:flex; align-items:baseline; justify-content:space-between; padding:16px 16px 10px; }
        .app-header h1 { font-size:20px; font-weight:700; letter-spacing:0.06em; margin:0; }
        .app-header .sub { font-size:11px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; }
        .content { padding:4px 16px 16px; }
        .section-label { margin:22px 0 10px; }
        .section-label .eyebrow { font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--amber); letter-spacing:0.12em; text-transform:uppercase; }
        .section-label h2 { font-size:15px; font-weight:600; margin:2px 0 0; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .card { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:12px; }
        .card-row { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .card-title { font-size:12px; color:var(--text-muted); margin-bottom:4px; }
        .card-value { font-family:'IBM Plex Mono',monospace; font-size:16px; font-weight:500; display:flex; align-items:center; gap:6px; }
        .pill { font-family:'IBM Plex Mono',monospace; font-size:11px; display:inline-flex; align-items:center; gap:3px; padding:2px 6px; border-radius:5px; }
        .pill-up { color:var(--up); background:rgba(62,207,142,0.12); }
        .pill-down { color:var(--down); background:rgba(255,92,92,0.12); }
        .row-name { display:flex; align-items:center; gap:10px; }
        .row-name .sym { font-size:11px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; }
        .row-right { text-align:right; }
        .row-right .price { font-family:'IBM Plex Mono',monospace; font-size:14px; }
        .macro-live-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--text-muted); margin-right:5px; }
        .macro-live-dot.live { background:var(--up); }
        .macro-cat { font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--amber); letter-spacing:0.1em; text-transform:uppercase; margin:16px 0 6px; }
        .bottom-nav { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:var(--panel-hi); border-top:1px solid var(--border); display:flex; overflow-x:auto; padding:8px 4px calc(8px + env(safe-area-inset-bottom)); }
        .nav-btn { flex:none; background:none; border:none; color:var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:3px; font-size:9px; font-family:'IBM Plex Mono',monospace; padding:4px 10px; cursor:pointer; }
        .nav-btn.active { color:var(--amber); }
        .empty-note { font-size:11px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; padding:10px 0; }
        .disclaimer { font-size:10.5px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; background:var(--panel); border:1px dashed var(--border); border-radius:8px; padding:10px 12px; margin:10px 0 4px; line-height:1.5; }
        .regime-matrix { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0 4px; }
        .regime-cell { border:1px solid var(--border); border-radius:10px; padding:12px; background:var(--panel); }
        .regime-cell.active { border-color:var(--amber); background:rgba(240,162,2,0.08); }
        .regime-cell .rname { font-weight:600; font-size:13px; margin-bottom:3px; }
        .regime-cell .rsub { font-size:10.5px; color:var(--text-muted); }
        .score-dial { text-align:center; padding:18px 12px; }
        .score-dial .num { font-family:'IBM Plex Mono',monospace; font-size:40px; font-weight:600; }
        .score-dial .lbl { font-size:12px; color:var(--text-muted); margin-top:2px; }
        .news-item { border-bottom:1px solid var(--border); padding:10px 0; }
        .news-item a { color:var(--text); text-decoration:none; font-size:13px; line-height:1.4; }
        .news-item .meta { font-size:10px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; margin-top:3px; }
        .region-row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--border); font-size:13px; }
        .region-tag { font-family:'IBM Plex Mono',monospace; font-size:10px; padding:2px 8px; border-radius:20px; }
        .region-tag.High { color:var(--down); background:rgba(255,92,92,0.12); }
        .region-tag.Medium { color:var(--amber); background:rgba(240,162,2,0.12); }
        .region-tag.Low { color:var(--up); background:rgba(62,207,142,0.12); }
      `}</style>

      <div className="ticker-wrap">
        <div className="ticker-track">
          {tickerItems.length
            ? [...tickerItems, ...tickerItems].map((t, i) => <span key={i}>{t}</span>)
            : <span>loading live tape…</span>}
        </div>
      </div>

      <div className="app-header">
        <h1>TAPE</h1>
        <span className="sub">{new Date().toUTCString().slice(0, 22)}</span>
      </div>

      <div className="content">
        {tab === "overview" && (
          <>
            <SectionLabel eyebrow="Snapshot">Market Overview</SectionLabel>
            <div className="grid-2">
              <div className="card">
                <div className="card-title">BTC / USD</div>
                <div className="card-value">{btc ? `$${fmtUsd(btc.current_price, 0)}` : "…"}</div>
                {btc && <Pill up={btc.price_change_percentage_24h >= 0}>{btc.price_change_percentage_24h?.toFixed(2)}%</Pill>}
                <Sparkline points={history["crypto:bitcoin"]} color="var(--amber)" />
              </div>
              <div className="card">
                <div className="card-title">Gold (XAU)</div>
                <div className="card-value">{xau ? `$${fmtUsd(xau.price)}` : "…"}</div>
                <Sparkline points={history["metal:XAU"]} color="var(--up)" />
              </div>
              <div className="card">
                <div className="card-title">EUR / USD</div>
                <div className="card-value">{eurusd ? eurusd.toFixed(4) : "…"}</div>
              </div>
              <div className="card">
                <div className="card-title">Fed Funds Rate</div>
                <div className="card-value">{macro.data?.find((m) => m.id === "FEDFUNDS")?.value ?? "…"}</div>
              </div>
            </div>
            <SectionLabel eyebrow="Session tape">Live since you opened this</SectionLabel>
            <div className="card">
              <div className="card-title">BTC — live-accumulating</div>
              <Sparkline points={history["crypto:bitcoin"]} color="var(--amber)" />
            </div>
          </>
        )}

        {tab === "macro" && (
          <>
            <SectionLabel eyebrow="United States">Macro, Micro & Socioeconomic</SectionLabel>
            <OverviewGrid title="Macro Overview" ids={MACRO_OVERVIEW_IDS} macroData={macro.data} />
            <OverviewGrid title="Socioeconomic Overview" ids={SOCIO_OVERVIEW_IDS} macroData={macro.data} />
            <OverviewGrid title="Micro Overview" ids={MICRO_OVERVIEW_IDS} macroData={macro.data} />
            <div className="macro-cat">Full Breakdown</div>
            {Object.keys(macroByCategory).map((cat) => (
              <div key={cat}>
                <div className="macro-cat">{cat}</div>
                {macroByCategory[cat].map((m) => (
                  <div className="card-row" key={m.id}>
                    <div className="row-name">
                      <span className={`macro-live-dot ${m.live ? "live" : ""}`} />
                      <div>
                        <div>{m.label}</div>
                        <div className="sym">{m.id}</div>
                      </div>
                    </div>
                    <div className="row-right"><div className="price">{m.value} <TrendArrow trend={m.trend} /></div></div>
                  </div>
                ))}
              </div>
            ))}
            <p className="empty-note">Dots are amber = placeholder, green = live via your FRED proxy.</p>
          </>
        )}

        {tab === "regime" && (
          <>
            <SectionLabel eyebrow="Framework">Macro Regime & Asset Bias</SectionLabel>

            <div className="grid-2" style={{ marginBottom: 4 }}>
              <div className="card">
                <div className="card-title">Growth</div>
                <div className="card-value">{growthState ?? "Reading…"}</div>
              </div>
              <div className="card">
                <div className="card-title">Inflation</div>
                <div className="card-value">{inflationState ?? "Reading…"}</div>
              </div>
              <div className="card">
                <div className="card-title">Policy Stance</div>
                <div className="card-value" style={{ fontSize: 13 }}>{fedStance}</div>
              </div>
              <div className="card">
                <div className="card-title">Yield Curve</div>
                <div className="card-value" style={{ fontSize: 13 }}>{curveInverted ? "Inverted" : "Normal"}</div>
              </div>
            </div>

            <div className="macro-cat">Market Regime Matrix</div>
            <div className="regime-matrix">
              {Object.entries(REGIME_MAP).map(([key, r]) => (
                <div className={`regime-cell ${key === regimeKey ? "active" : ""}`} key={key}>
                  <div className="rname">{r.name}</div>
                  <div className="rsub">{key.replace("|", " · ")}</div>
                </div>
              ))}
            </div>

            <div className="macro-cat">Current Regime</div>
            <div className="card">
              <div className="card-title">{regime ? regime.name : "Not enough trend data yet"}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                {regime ? regime.bias : "Give the FRED proxy a moment to gather trend direction."}
              </div>
            </div>

            <div className="macro-cat">Global Macro Market Bias</div>
            <div className="card">
              <div className="card-value" style={{ fontSize: 14 }}>{globalBias}</div>
            </div>

            {regime && (
              <>
                <div className="macro-cat">Asset Bias (educational framework)</div>
                <div className="card-row"><div className="row-name">Equities</div><div className="row-right">{regime.equities}</div></div>
                <div className="card-row"><div className="row-name">Bonds</div><div className="row-right">{regime.bonds}</div></div>
                <div className="card-row"><div className="row-name">Commodities</div><div className="row-right">{regime.commodities}</div></div>
                <div className="card-row"><div className="row-name">US Dollar</div><div className="row-right">{regime.usd}</div></div>
              </>
            )}

            <div className="disclaimer">
              Built from real FRED growth/inflation/rates trend directions using a simple textbook regime
              framework (Goldilocks / Reflation / Stagflation / Deflationary Bust). This is educational
              context, not investment advice or a signal to trade on.
            </div>
          </>
        )}

        {tab === "banks" && (
          <>
            <SectionLabel eyebrow="Live via FRED">Banking & Liquidity</SectionLabel>
            <OverviewGrid title="Banking Stress Overview" ids={BANKS_OVERVIEW_IDS} macroData={macro.data} />
            <div className="macro-cat">Detail</div>
            {(macroByCategory["Banking & Liquidity"] || []).map((m) => (
              <div className="card-row" key={m.id}>
                <div className="row-name">
                  <span className={`macro-live-dot ${m.live ? "live" : ""}`} />
                  <div>
                    <div>{m.label}</div>
                    <div className="sym">{m.id}</div>
                  </div>
                </div>
                <div className="row-right"><div className="price">{m.value} <TrendArrow trend={m.trend} /></div></div>
              </div>
            ))}
            <div className="disclaimer">
              Financial Stress Index (STLFSI4), Fed balance sheet, overnight reverse repo, bank reserve
              balances, and SOFR are real, official series from the St. Louis Fed — this tab isn't a
              heuristic, unlike Regime and Sentiment.
            </div>
          </>
        )}

        {tab === "sentiment" && (
          <>
            <SectionLabel eyebrow="Composite">Market Sentiment</SectionLabel>
            <div className="card score-dial">
              <div className="num" style={{ color: sentimentScore == null ? "var(--text-muted)" : sentimentScore < 40 ? "var(--down)" : sentimentScore > 60 ? "var(--up)" : "var(--amber)" }}>
                {sentimentScore ?? "…"}
              </div>
              <div className="lbl">{sentimentLabel}</div>
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="card">
                <div className="card-title">Crypto Breadth (24h up)</div>
                <div className="card-value">{cryptoBreadthPct != null ? `${cryptoBreadthPct}%` : "…"}</div>
              </div>
              <div className="card">
                <div className="card-title">BTC Momentum</div>
                <div className="card-value">{btc ? `${btcMomentum.toFixed(2)}%` : "…"}</div>
              </div>
              <div className="card">
                <div className="card-title">Consumer Sentiment (UMich)</div>
                <div className="card-value">{umcsent ? umcsent.value : "…"}</div>
              </div>
              <div className="card">
                <div className="card-title">Regime Bias</div>
                <div className="card-value" style={{ fontSize: 12.5 }}>{globalBias}</div>
              </div>
            </div>
            <div className="disclaimer">
              Composite of three real inputs: crypto breadth, BTC 24h momentum, and University of Michigan
              Consumer Sentiment (via FRED). This is a simple average I built for a quick read — it isn't
              the CNN Fear & Greed Index or any other proprietary sentiment gauge.
            </div>
          </>
        )}

        {tab === "risk" && (
          <>
            <SectionLabel eyebrow="Derived from GDELT news data">Geopolitical Risk</SectionLabel>
            {news.error && <p className="empty-note">{news.error}</p>}
            <div className="card score-dial">
              <div className="num" style={{ color: !news.data ? "var(--text-muted)" : news.data.riskScore > 65 ? "var(--down)" : news.data.riskScore > 35 ? "var(--amber)" : "var(--up)" }}>
                {news.data ? news.data.riskScore : "…"}
              </div>
              <div className="lbl">
                {news.data ? (news.data.riskScore > 65 ? "Elevated" : news.data.riskScore > 35 ? "Moderate" : "Low") : "Loading…"}
              </div>
            </div>

            <div className="macro-cat">Probable Impact Snapshot</div>
            {news.data?.regionRisk?.map((r) => (
              <div className="region-row" key={r.region}>
                <div>{r.region}</div>
                <span className={`region-tag ${r.level}`}>{r.level}</span>
              </div>
            ))}

            <div className="macro-cat">High-Impact News</div>
            {news.data?.articles?.map((a, i) => (
              <div className="news-item" key={i}>
                <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
                <div className="meta">{a.domain}</div>
              </div>
            ))}

            <div className="disclaimer">
              Score and region tags are built from the volume and tone of recent global news via GDELT
              (a free public news database) — not an official index like the Caldara-Iacoviello GPR Index.
              Treat this as a rough, real-time news-driven signal, not a verified geopolitical assessment.
            </div>
          </>
        )}

        {tab === "crypto" && (
          <>
            <SectionLabel eyebrow="Top movers">Crypto</SectionLabel>
            {crypto.error && <p className="empty-note">{crypto.error}</p>}
            {crypto.data?.map((c) => (
              <div className="card-row" key={c.id}>
                <div className="row-name">
                  <img src={c.image} alt="" width={22} height={22} style={{ borderRadius: 6 }} />
                  <div>
                    <div>{c.name}</div>
                    <div className="sym">{c.symbol.toUpperCase()}</div>
                  </div>
                </div>
                <div className="row-right">
                  <div className="price">${fmtUsd(c.current_price, c.current_price < 1 ? 4 : 2)}</div>
                  <Pill up={c.price_change_percentage_24h >= 0}>{c.price_change_percentage_24h?.toFixed(2)}%</Pill>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "forex" && (
          <>
            <SectionLabel eyebrow="ECB reference rates">Forex</SectionLabel>
            {forex.error && <p className="empty-note">{forex.error}</p>}
            {forex.data && FX_PAIRS.map((p) => {
              const rate = p.base === "USD"
                ? forex.data[p.quote]
                : p.quote === "USD"
                  ? 1 / forex.data[p.base]
                  : forex.data[p.quote] / forex.data[p.base];
              return (
                <div className="card-row" key={p.label}>
                  <div className="row-name"><div>{p.label}</div></div>
                  <div className="row-right"><div className="price">{rate ? rate.toFixed(4) : "—"}</div></div>
                </div>
              );
            })}
            <p className="empty-note">Daily ECB reference rates via Frankfurter — refreshed every 5 min.</p>
          </>
        )}

        {tab === "metals" && (
          <>
            <SectionLabel eyebrow="Spot, per troy oz">Gold & Silver</SectionLabel>
            {metals.error && <p className="empty-note">{metals.error}</p>}
            {metals.data?.map((m) => (
              <div className="card" key={m.symbol} style={{ marginBottom: 10 }}>
                <div className="card-title">{m.name} ({m.symbol})</div>
                <div className="card-value">${fmtUsd(m.price)}</div>
                <Sparkline points={history[`metal:${m.symbol}`]} color={m.symbol === "XAU" ? "var(--amber)" : "var(--text-muted)"} />
              </div>
            ))}
          </>
        )}
      </div>

      <div className="bottom-nav">
        <button className={`nav-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}><LayoutGrid size={16} /> OVERVIEW</button>
        <button className={`nav-btn ${tab === "macro" ? "active" : ""}`} onClick={() => setTab("macro")}><Landmark size={16} /> MACRO</button>
        <button className={`nav-btn ${tab === "regime" ? "active" : ""}`} onClick={() => setTab("regime")}><Compass size={16} /> REGIME</button>
        <button className={`nav-btn ${tab === "banks" ? "active" : ""}`} onClick={() => setTab("banks")}><Building2 size={16} /> BANKS</button>
        <button className={`nav-btn ${tab === "sentiment" ? "active" : ""}`} onClick={() => setTab("sentiment")}><Gauge size={16} /> SENTIMENT</button>
        <button className={`nav-btn ${tab === "risk" ? "active" : ""}`} onClick={() => setTab("risk")}><Globe2 size={16} /> RISK</button>
        <button className={`nav-btn ${tab === "crypto" ? "active" : ""}`} onClick={() => setTab("crypto")}><Bitcoin size={16} /> CRYPTO</button>
        <button className={`nav-btn ${tab === "forex" ? "active" : ""}`} onClick={() => setTab("forex")}><CircleDollarSign size={16} /> FOREX</button>
        <button className={`nav-btn ${tab === "metals" ? "active" : ""}`} onClick={() => setTab("metals")}><Gem size={16} /> METALS</button>
      </div>
    </div>
  );
}             
