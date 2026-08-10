import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, ResponsiveContainer, YAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, Bitcoin, Landmark,
  CircleDollarSign, Gem, LayoutGrid, Compass, Building2,
  Gauge, Globe2, Newspaper, Scale, CalendarClock, Bot, Send, Gavel,
  Menu, X, Sun, Moon, Calendar, Fish,
} from "lucide-react";

const MACRO_API_BASE = "";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", Icon: LayoutGrid },
  { id: "macro", label: "Macro", Icon: Landmark },
  { id: "regime", label: "Regime", Icon: Compass },
  { id: "banks", label: "Banks", Icon: Building2 },
  { id: "fed", label: "Fed", Icon: CalendarClock },
  { id: "calendar", label: "Econ Calendar", Icon: Calendar },
  { id: "confluence", label: "Confluence", Icon: Scale },
  { id: "makers", label: "Market Makers", Icon: Gavel },
  { id: "sentiment", label: "Sentiment", Icon: Gauge },
  { id: "risk", label: "Risk", Icon: Globe2 },
  { id: "crypto", label: "Crypto", Icon: Bitcoin },
  { id: "whales", label: "Whale Watch", Icon: Fish },
  { id: "forex", label: "Forex", Icon: CircleDollarSign },
  { id: "metals", label: "Metals", Icon: Gem },
  { id: "ask", label: "Ask AI", Icon: Bot },
];

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
  { category: "Growth & Output", id: "GDP", label: "GDP (nominal)", placeholder: "$29.0T", sense: "up-bull", format: "trillions" },
  { category: "Growth & Output", id: "GDPC1", label: "Real GDP", placeholder: "$23.5T", sense: "up-bull", format: "trillions" },
  { category: "Growth & Output", id: "INDPRO", label: "Industrial Production", placeholder: "103.2", sense: "up-bull", format: "index" },
  { category: "Growth & Output", id: "RSAFS", label: "Retail Sales", placeholder: "$720B", sense: "up-bull", format: "billionsFromMillions" },
  { category: "Growth & Output", id: "PCE", label: "Personal Consumption", placeholder: "$19.8T", sense: "up-bull", format: "trillions" },

  { category: "Prices & Inflation", id: "CPIAUCSL", label: "CPI (YoY)", placeholder: "2.7%", sense: "up-bear", format: "percent", yoy: true },
  { category: "Prices & Inflation", id: "CPILFESL", label: "Core CPI (YoY)", placeholder: "3.0%", sense: "up-bear", format: "percent", yoy: true },
  { category: "Prices & Inflation", id: "PPIACO", label: "Producer Price Index", placeholder: "254.1", sense: "up-bear", format: "index" },
  { category: "Prices & Inflation", id: "M2SL", label: "M2 Money Supply", placeholder: "$21.6T", sense: "up-bull", format: "trillionsFromBillions" },

  { category: "Labor & Socioeconomic", id: "UNRATE", label: "Unemployment Rate", placeholder: "4.1%", sense: "up-bear", format: "percent" },
  { category: "Labor & Socioeconomic", id: "PAYEMS", label: "Nonfarm Payrolls (chg)", placeholder: "-23K", sense: "up-bull", format: "signedK", yoy: false, momChange: true },
  { category: "Labor & Socioeconomic", id: "CIVPART", label: "Labor Force Participation", placeholder: "62.5%", sense: "up-bull", format: "percent" },
  { category: "Labor & Socioeconomic", id: "ICSA", label: "Initial Jobless Claims", placeholder: "225K", sense: "up-bear", format: "thousandsK" },
  { category: "Labor & Socioeconomic", id: "MEHOINUSA672N", label: "Median Household Income", placeholder: "$80.6K", sense: "up-bull", format: "dollar" },
  { category: "Labor & Socioeconomic", id: "UMCSENT", label: "Consumer Sentiment", placeholder: "68.5", sense: "up-bull", format: "index" },

  { category: "Housing", id: "HOUST", label: "Housing Starts", placeholder: "1.35M", sense: "up-bull", format: "millionsFromThousands" },
  { category: "Housing", id: "MSPUS", label: "Median Home Sale Price", placeholder: "$420K", sense: "up-bull", format: "dollar" },
  { category: "Housing", id: "MORTGAGE30US", label: "30-Yr Mortgage Rate", placeholder: "6.7%", sense: "up-bear", format: "percent" },

  { category: "Rates & Money", id: "FEDFUNDS", label: "Fed Funds Rate", placeholder: "4.33%", sense: "up-bear", format: "percent" },
  { category: "Rates & Money", id: "DGS2", label: "2-Year Yield", placeholder: "4.10%", sense: "up-bear", format: "percent" },
  { category: "Rates & Money", id: "DGS10", label: "10-Year Yield", placeholder: "4.31%", sense: "up-bear", format: "percent" },
  { category: "Rates & Money", id: "T10Y2Y", label: "10Y-2Y Spread", placeholder: "0.21%", sense: "curve", format: "percent" },

  { category: "Banking & Liquidity", id: "STLFSI4", label: "Financial Stress Index", placeholder: "-0.30", sense: "up-bear", format: "decimal2" },
  { category: "Banking & Liquidity", id: "WALCL", label: "Fed Balance Sheet", placeholder: "$6.9T", sense: "up-bull", format: "trillionsFromMillions" },
  { category: "Banking & Liquidity", id: "RRPONTSYD", label: "Overnight Reverse Repo", placeholder: "$150B", sense: "up-bear", format: "billions" },
  { category: "Banking & Liquidity", id: "WRESBAL", label: "Bank Reserve Balances", placeholder: "$3.2T", sense: "up-bull", format: "trillionsFromMillions" },
  { category: "Banking & Liquidity", id: "SOFR", label: "SOFR (overnight funding)", placeholder: "4.30%", sense: "up-bear", format: "percent" },
];

// Turns a raw FRED value (a string, sometimes with many trailing decimal
// digits, in whatever unit that series happens to use — millions, thousands,
// raw dollars, etc.) into a clean, human display string.
function formatMacroValue(fmt, raw) {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  switch (fmt) {
    case "percent": return `${n.toFixed(2)}%`;
    case "decimal2": return n.toFixed(2);
    case "index": return n.toFixed(1);
    case "trillions": return `$${(n / 1000).toFixed(2)}T`;
    case "trillionsFromMillions": return `$${(n / 1e6).toFixed(2)}T`;
    case "trillionsFromBillions": return `$${(n / 1000).toFixed(2)}T`;
    case "billionsFromMillions": return `$${(n / 1000).toFixed(1)}B`;
    case "billions": return `$${n.toFixed(1)}B`;
    case "millionsFromThousands": return `${(n / 1000).toFixed(2)}M`;
    case "thousandsK": return `${Math.round(n).toLocaleString()}`;
    case "signedK": return `${n > 0 ? "+" : ""}${Math.round(n)}K`;
    case "dollar": return `$${Math.round(n).toLocaleString()}`;
    default: return raw;
  }
}

// Given a merged macro series object ({ id, value, trend, sense }), return a
// Bullish / Bearish / Neutral read. "up-bull" = rising is constructive for
// growth/liquidity/risk sentiment; "up-bear" = rising is a headwind (tighter
// policy, higher costs, more stress); "curve" = special-cased for T10Y2Y,
// where an inverted spread overrides the trend read.
function biasForSeries(m) {
  if (!m || m.trend == null) return "Neutral";
  if (m.sense === "curve") {
    const v = parseFloat(m.value);
    if (!Number.isNaN(v) && v < 0) return "Bearish";
    if (m.trend === "flat") return "Neutral";
    return m.trend === "up" ? "Bullish" : "Bearish";
  }
  if (m.trend === "flat") return "Neutral";
  const risingIsGood = m.sense === "up-bull";
  return (m.trend === "up") === risingIsGood ? "Bullish" : "Bearish";
}

const MACRO_OVERVIEW_IDS = ["GDP", "GDPC1", "CPIAUCSL", "FEDFUNDS", "DGS10", "T10Y2Y"];
const SOCIO_OVERVIEW_IDS = ["UNRATE", "CIVPART", "PAYEMS", "MEHOINUSA672N", "UMCSENT", "ICSA"];
const MICRO_OVERVIEW_IDS = ["RSAFS", "INDPRO", "PPIACO", "HOUST", "MSPUS", "MORTGAGE30US"];
const BANKS_OVERVIEW_IDS = ["STLFSI4", "WALCL", "RRPONTSYD", "WRESBAL", "SOFR"];

const REGIME_MAP = {
  "Accelerating|Cooling": {
    name: "Goldilocks",
    bias: "Historically supportive of risk assets — growth expanding while inflation cools.",
    equities: "Constructive", bonds: "Neutral-to-positive", commodities: "Neutral", usd: "Softer bias",
  },
  "Accelerating|Rising": {
    name: "Reflation",
    bias: "Growth expanding alongside rising inflation — cyclicals & real assets often lead.",
    equities: "Selective (cyclicals)", bonds: "Pressured", commodities: "Constructive", usd: "Mixed",
  },
  "Decelerating|Rising": {
    name: "Stagflation",
    bias: "The hardest regime — growth slowing while inflation stays sticky.",
    equities: "Defensive", bonds: "Pressured", commodities: "Constructive (esp. gold)", usd: "Firmer bias",
  },
  "Decelerating|Cooling": {
    name: "Deflationary Bust",
    bias: "Growth and inflation both falling — classic risk-off, flight to quality.",
    equities: "Defensive", bonds: "Constructive", commodities: "Soft", usd: "Firmer (safe-haven)",
  },
};

// 2026 FOMC statement days (day 2 of each 2-day meeting), confirmed via federalreserve.gov
const FOMC_2026 = [
  { date: "2026-01-28", sep: false },
  { date: "2026-03-18", sep: true },
  { date: "2026-04-29", sep: false },
  { date: "2026-06-17", sep: true },
  { date: "2026-07-29", sep: false },
  { date: "2026-09-16", sep: true },
  { date: "2026-10-28", sep: false },
  { date: "2026-12-09", sep: true },
];

// 2026 CPI release days — official OMB "Schedule of Release Dates for
// Principal Federal Economic Indicators" (BLS), confirmed for the full year.
const CPI_2026 = [
  { date: "2026-08-12", confirmed: true },
  { date: "2026-09-11", confirmed: true },
  { date: "2026-10-14", confirmed: true },
  { date: "2026-11-10", confirmed: true },
  { date: "2026-12-10", confirmed: true },
];

// 2026 Non-Farm Payrolls (Employment Situation) release days — official OMB
// schedule (BLS), confirmed for the full year.
const NFP_2026 = [
  { date: "2026-09-04", confirmed: true },
  { date: "2026-10-02", confirmed: true },
  { date: "2026-11-06", confirmed: true },
  { date: "2026-12-04", confirmed: true },
];

// 2026 Advance Retail Sales release days — official OMB schedule (Census),
// confirmed for the full year.
const RETAIL_2026 = [
  { date: "2026-08-14", confirmed: true },
  { date: "2026-09-16", confirmed: true },
  { date: "2026-10-15", confirmed: true },
  { date: "2026-11-17", confirmed: true },
  { date: "2026-12-16", confirmed: true },
];

// Illustrative average 1-hour reaction stats for gold/BTC around each print.
// These are ballpark, desk-lore-style estimates for an educational "what
// tends to happen" reference — NOT computed from live tick data (this
// dashboard has no historical intraday feed to calculate real ones).
const MARKET_MAKER_EVENTS = [
  {
    id: "NFP", name: "Non-Farm Payrolls", desc: "US jobs report — the king of prints",
    stars: 3, dates: NFP_2026, seriesId: "PAYEMS", goldMove: 0.42, btcMove: 0.8,
  },
  {
    id: "CPI", name: "CPI Inflation", desc: "Consumer Price Index YoY",
    stars: 3, dates: CPI_2026, seriesId: "CPIAUCSL", goldMove: 0.56, btcMove: 1.04,
  },
  {
    id: "FOMC", name: "FOMC Decision", desc: "Fed rate decision + Powell presser",
    stars: 3, dates: FOMC_2026.map((f) => ({ date: f.date, confirmed: true })), seriesId: "FEDFUNDS", goldMove: 0.71, btcMove: 1.35,
  },
  {
    id: "RETAIL", name: "Retail Sales", desc: "Consumer spending pulse",
    stars: 2, dates: RETAIL_2026, seriesId: "RSAFS", goldMove: 0.3, btcMove: 0.55,
  },
];

const FED_ASSET_IMPACT = {
  Hawkish: {
    Gold: "Headwind — higher real yields compete with non-yielding gold",
    "BTC / Crypto": "Headwind — tighter liquidity pressures risk assets",
    "US Dollar": "Supportive — wider rate differentials favor the dollar",
    "Growth equities": "Headwind — higher discount rates pressure valuations",
  },
  Dovish: {
    Gold: "Tailwind — falling real yields support gold",
    "BTC / Crypto": "Tailwind — easier liquidity supports risk assets",
    "US Dollar": "Headwind — narrowing rate differentials",
    "Growth equities": "Tailwind — lower discount rates support valuations",
  },
  "Neutral / Data-dependent": {
    Gold: "Mixed — no clear rate-driven bias right now",
    "BTC / Crypto": "Mixed — no clear rate-driven bias right now",
    "US Dollar": "Mixed — no clear rate-driven bias right now",
    "Growth equities": "Mixed — no clear rate-driven bias right now",
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
          const bias = m ? biasForSeries(m) : null;
          return (
            <div className="card" key={id}>
              <div className="card-title">{m ? m.label : id}</div>
              <div className="card-value">
                {m ? m.value : "…"} {m && <TrendArrow trend={m.trend} />}
              </div>
              {bias && (
                <span className={`factor-tag ${bias === "Bullish" ? "bull" : bias === "Bearish" ? "bear" : "neu"}`} style={{ marginTop: 6, display: "inline-block" }}>
                  {bias}
                </span>
              )}
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
  const [askQuestion, setAskQuestion] = useState("");
  const [askLog, setAskLog] = useState([]);
  const [askLoading, setAskLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("tape-theme") : null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem("tape-theme", next);
      return next;
    });
  }

  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => setUser(j.user)).catch(() => {});
  }, []);

  async function submitAuth() {
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/auth/${authMode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || "Something went wrong");
        return;
      }
      setUser({ email: json.email, role: json.role });
      setAuthOpen(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (e) {
      setAuthError("Network error — try again");
    } finally {
      setAuthLoading(false);
    }
  }

  async function doLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

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
    if (json.rates?.EUR) pushHistory("fx:EURUSD", 1 / json.rates.EUR);
    return json.rates;
  }, 5 * 60000, []);

  const macro = useLivePoll(async () => {
    const results = await Promise.all(
      MACRO_SERIES.map(async (s) => {
        try {
          const qs = s.yoy
            ? `series=${s.id}&transform=yoy`
            : s.momChange
              ? `series=${s.id}&transform=mom_change`
              : `series=${s.id}`;
          const res = await fetch(`${MACRO_API_BASE}/api/fred?${qs}`);
          if (!res.ok) throw new Error("no proxy");
          const json = await res.json();
          if (json.value == null) throw new Error("no value");
          const displayValue = s.yoy
            ? `${parseFloat(json.value).toFixed(2)}%`
            : formatMacroValue(s.format, json.value);
          return { ...s, value: displayValue, raw: json.value, trend: json.trend ?? "flat", live: true };
        } catch {
          return { ...s, value: s.placeholder, raw: null, trend: "flat", live: false };
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

  const gdpAccel = useLivePoll(async () => {
    const res = await fetch(`${MACRO_API_BASE}/api/fred?series=GDPC1&transform=accel`);
    if (!res.ok) throw new Error("no proxy");
    const json = await res.json();
    if (json.value == null) throw new Error("no value");
    return json;
  }, 0, []);

  const econCalendar = useLivePoll(async () => {
    const res = await fetch("/api/calendar");
    if (!res.ok) throw new Error("calendar unavailable");
    const json = await res.json();
    if (json.debug) console.warn("Econ calendar debug:", json.debug);
    return json;
  }, 60 * 60000, []);

  const whales = useLivePoll(async () => {
    const res = await fetch("/api/whales");
    if (!res.ok) throw new Error("whale feed unavailable");
    const json = await res.json();
    if (json.debug) console.warn("Whale feed debug:", json.debug);
    return json;
  }, 3 * 60000, []);

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

  // ---- Per-indicator Bullish/Bearish/Neutral tags + summary counts ----
  const macroBiasCounts = { Bullish: 0, Bearish: 0, Neutral: 0 };
  (macro.data || []).forEach((m) => {
    macroBiasCounts[biasForSeries(m)] += 1;
  });
  const macroBiasTotal = macro.data?.length || 0;
  const macroOverallBias = macroBiasTotal === 0
    ? "…"
    : macroBiasCounts.Bullish > macroBiasCounts.Bearish
      ? "Net Bullish"
      : macroBiasCounts.Bearish > macroBiasCounts.Bullish
        ? "Net Bearish"
        : "Balanced";

  // ---- Regime / bias logic ----
  const gdp = macro.data?.find((m) => m.id === "GDPC1");
  const cpi = macro.data?.find((m) => m.id === "CPIAUCSL");
  const fedFunds = macro.data?.find((m) => m.id === "FEDFUNDS");
  const curve = macro.data?.find((m) => m.id === "T10Y2Y");

  const growthState = gdpAccel.data?.trend === "up" ? "Accelerating" : gdpAccel.data?.trend === "down" ? "Decelerating" : null;
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

  // ---- Fed Hawk-Dove meter ----
  const dgs2 = macro.data?.find((m) => m.id === "DGS2");
  const stlfsi = macro.data?.find((m) => m.id === "STLFSI4");
  const fedFundsTrendScore = fedFunds?.trend === "up" ? 1 : fedFunds?.trend === "down" ? -1 : 0;
  const dgs2TrendScore = dgs2?.trend === "up" ? 1 : dgs2?.trend === "down" ? -1 : 0;
  const cpiTrendScore = cpi?.trend === "up" ? 1 : cpi?.trend === "down" ? -1 : 0;
  const stressTrendScore = stlfsi?.trend === "up" ? -1 : stlfsi?.trend === "down" ? 1 : 0;
  const hawkAvg = (fedFundsTrendScore + dgs2TrendScore + cpiTrendScore + stressTrendScore) / 4;
  const hawkScore = Math.round(50 + hawkAvg * 50);
  const hawkLabel = hawkScore >= 65 ? "Hawkish" : hawkScore <= 35 ? "Dovish" : "Neutral / Data-dependent";

  const today = new Date();
  const nextFomc = FOMC_2026.map((f) => ({ ...f, d: new Date(f.date) })).find((f) => f.d >= today) || null;
  const daysToFomc = nextFomc ? Math.ceil((nextFomc.d - today) / 86400000) : null;
  const nextCpi = CPI_2026.map((c) => ({ ...c, d: new Date(c.date) })).find((c) => c.d >= today) || null;
  const daysToCpi = nextCpi ? Math.ceil((nextCpi.d - today) / 86400000) : null;

  // ---- Market Makers: reaction stats around high-impact prints ----
  function nextEventDate(dates) {
    const found = dates.map((d) => ({ ...d, d: new Date(d.date) })).find((d) => d.d >= today) || null;
    return found ? { ...found, days: Math.ceil((found.d - today) / 86400000) } : null;
  }
  const marketMakerEvents = MARKET_MAKER_EVENTS.map((ev) => {
    const next = nextEventDate(ev.dates);
    const live = macro.data?.find((m) => m.id === ev.seriesId);
    return { ...ev, next, live };
  });
  const nextMarketMaker = marketMakerEvents
    .filter((e) => e.next)
    .sort((a, b) => a.next.days - b.next.days)[0] || null;
  const avgGoldMove1h = marketMakerEvents.reduce((s, e) => s + e.goldMove, 0) / marketMakerEvents.length;
  const avgBtcMove1h = marketMakerEvents.reduce((s, e) => s + e.btcMove, 0) / marketMakerEvents.length;
  const btcBeta = (avgBtcMove1h / avgGoldMove1h).toFixed(1);

  // ---- Bull/Bear confluence engine ----
  const walcl = macro.data?.find((m) => m.id === "WALCL");
  const rrp = macro.data?.find((m) => m.id === "RRPONTSYD");
  const liquiditySignRaw = (walcl?.trend === "up" ? 1 : walcl?.trend === "down" ? -1 : 0)
    + (rrp?.trend === "down" ? 1 : rrp?.trend === "up" ? -1 : 0);
  const liquiditySign = liquiditySignRaw > 0 ? 1 : liquiditySignRaw < 0 ? -1 : 0;
  const liquidityNote = `Fed B/S ${walcl?.trend || "flat"}, RRP ${rrp?.trend || "flat"}`;

  const eurusdHist = history["fx:EURUSD"];
  const usdStrengthening = eurusdHist && eurusdHist.length >= 2
    ? eurusdHist[eurusdHist.length - 1] < eurusdHist[0]
    : null;

  const newsRiskScore = news.data?.riskScore;
  const riskOffScore = newsRiskScore == null ? 0 : newsRiskScore > 65 ? -1 : newsRiskScore < 35 ? 1 : 0;
  const riskHavenScore = newsRiskScore == null ? 0 : newsRiskScore > 65 ? 1 : newsRiskScore < 35 ? -1 : 0;

  function factor(label, value, note) {
    return { label, value, note: note ?? "—" };
  }

  function buildConfluence(name, factors) {
    const score = factors.reduce((s, f) => s + f.value, 0);
    const pct = Math.round(50 + (score / factors.length) * 50);
    const bias = pct >= 60 ? "Bullish" : pct <= 40 ? "Bearish" : "Neutral";
    return { name, pct, bias, factors };
  }

  const btcConfluence = buildConfluence("BTC / Crypto", [
    factor("Fed stance", hawkLabel === "Dovish" ? 1 : hawkLabel === "Hawkish" ? -1 : 0, hawkLabel),
    factor("Liquidity (Fed B/S − RRP)", liquiditySign, liquidityNote),
    factor("Yield curve", curveInverted ? -1 : 0, curveInverted ? "Inverted — risk-off pressure" : "Normal"),
    factor("24h momentum", btcMomentum > 0 ? 1 : btcMomentum < 0 ? -1 : 0, btc ? `${btcMomentum.toFixed(2)}%` : "—"),
    factor("Geopolitical risk", riskOffScore, news.data ? `Risk score ${news.data.riskScore}` : "—"),
  ]);

  const goldConfluence = buildConfluence("Gold (XAU)", [
    factor("Fed stance", hawkLabel === "Dovish" ? 1 : hawkLabel === "Hawkish" ? -1 : 0, hawkLabel),
    factor("2Y yield (real-rate proxy)", dgs2?.trend === "up" ? -1 : dgs2?.trend === "down" ? 1 : 0, dgs2 ? dgs2.value : "—"),
    factor("Inflation trend", cpiTrendScore, cpi ? `CPI ${cpi.value}` : "—"),
    factor("US Dollar direction", usdStrengthening === true ? -1 : usdStrengthening === false ? 1 : 0, eurusd ? `EUR/USD ${eurusd.toFixed(4)}` : "—"),
    factor("Safe-haven bid", riskHavenScore, news.data ? `Risk score ${news.data.riskScore}` : "—"),
  ]);

  const usdConfluence = buildConfluence("US Dollar", [
    factor("Fed stance", hawkLabel === "Hawkish" ? 1 : hawkLabel === "Dovish" ? -1 : 0, hawkLabel),
    factor("2Y yield direction", dgs2?.trend === "up" ? 1 : dgs2?.trend === "down" ? -1 : 0, dgs2 ? dgs2.value : "—"),
    factor("Yield curve", curveInverted ? -1 : 0, curveInverted ? "Inverted" : "Normal"),
    factor("Safe-haven bid", riskHavenScore, news.data ? `Risk score ${news.data.riskScore}` : "—"),
    factor("Global liquidity", -liquiditySign, liquidityNote),
  ]);

  const bondsConfluence = buildConfluence("US 10Y Treasuries (price)", [
    factor("Fed stance", hawkLabel === "Dovish" ? 1 : hawkLabel === "Hawkish" ? -1 : 0, hawkLabel),
    factor("Inflation trend", cpi?.trend === "down" ? 1 : cpi?.trend === "up" ? -1 : 0, cpi ? `CPI ${cpi.value}` : "—"),
    factor("Growth trend", growthState === "Decelerating" ? 1 : growthState === "Accelerating" ? -1 : 0, growthState || "—"),
    factor("Financial stress", stlfsi?.trend === "up" ? 1 : stlfsi?.trend === "down" ? -1 : 0, stlfsi ? stlfsi.value : "—"),
  ]);

  const confluenceBoard = [btcConfluence, goldConfluence, usdConfluence, bondsConfluence];

  async function askAI() {
    if (!askQuestion.trim() || askLoading) return;
    const q = askQuestion.trim();
    setAskLog((log) => [...log, { role: "user", text: q }]);
    setAskQuestion("");
    setAskLoading(true);
    try {
      const context = {
        fedFundsRate: fedFunds?.value,
        fedStance: hawkLabel,
        cpi: cpi?.value,
        curve10y2y: curve?.value,
        curveInverted,
        btcPrice: btc?.current_price,
        btcMomentum24h: btcMomentum,
        goldPrice: xau?.price,
        eurUsd: eurusd,
        macroRegime: regime?.name,
        sentimentScore,
        geopoliticalRiskScore: newsRiskScore,
        confluence: confluenceBoard.map((c) => ({ name: c.name, bias: c.bias, score: c.pct })),
      };
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });
      const json = await res.json();
      setAskLog((log) => [...log, { role: "ai", text: json.answer || json.error || "No response." }]);
    } catch (e) {
      setAskLog((log) => [...log, { role: "ai", text: `Error: ${e.message}` }]);
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <div className={`tape-root ${theme === "light" ? "light" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
        .tape-root { --bg:#0a0c10; --panel:#12161d; --panel-hi:#171d27; --border:#242b38; --text:#eceef2; --text-muted:#7c8494; --amber:#f0a900; --accent2:#4da3ff; --up:#33d17e; --down:#ff5c6c; font-family:'Space Grotesk',sans-serif; background:radial-gradient(ellipse at top,#12161f 0%,var(--bg) 60%); color:var(--text); min-height:100vh; max-width:480px; margin:0 auto; padding-bottom:24px; position:relative; transition:background 0.2s ease, color 0.2s ease; }
        .tape-root.light { --bg:#f4f5f7; --panel:#ffffff; --panel-hi:#eceef2; --border:#dde1e8; --text:#12161d; --text-muted:#5b6472; --amber:#b5790a; --accent2:#2f6fe0; --up:#1a8f52; --down:#d33a3a; background:radial-gradient(ellipse at top,#ffffff 0%,var(--bg) 60%); }
        .icon-btn { background:none; border:1px solid var(--border); border-radius:8px; color:var(--text); padding:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s ease, transform 0.12s ease; }
        .icon-btn:active { transform:scale(0.94); }
        .drawer-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); z-index:60; animation:fade-in 0.15s ease; }
        .drawer-panel { position:fixed; top:0; left:0; bottom:0; width:78%; max-width:300px; background:var(--panel-hi); border-right:1px solid var(--border); box-shadow:8px 0 30px rgba(0,0,0,0.4); display:flex; flex-direction:column; animation:slide-in 0.18s ease; }
        @keyframes slide-in { from{transform:translateX(-12px); opacity:0.6;} to{transform:translateX(0); opacity:1;} }
        .drawer-head { display:flex; align-items:center; justify-content:space-between; padding:16px; border-bottom:1px solid var(--border); }
        .drawer-list { display:flex; flex-direction:column; padding:8px; overflow-y:auto; }
        .drawer-item { display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:8px; background:none; border:none; color:var(--text-muted); font-family:'Space Grotesk',sans-serif; font-size:13.5px; cursor:pointer; text-align:left; transition:background 0.15s ease, color 0.15s ease; }
        .drawer-item.active { color:var(--amber); background:rgba(240,169,0,0.1); font-weight:600; }
        .drawer-item:active { transform:scale(0.98); }
        .mono { font-family:'IBM Plex Mono',monospace; }
        .ticker-wrap { position:relative; background:#000; border-bottom:1px solid var(--border); overflow:hidden; white-space:nowrap; padding:7px 0; }
        .ticker-wrap::before, .ticker-wrap::after { content:''; position:absolute; top:0; bottom:0; width:28px; z-index:2; pointer-events:none; }
        .ticker-wrap::before { left:0; background:linear-gradient(90deg,#000,transparent); }
        .ticker-wrap::after { right:0; background:linear-gradient(270deg,#000,transparent); }
        .ticker-track { display:inline-block; animation:scroll-left 22s linear infinite; }
        .ticker-track span { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--amber); margin-right:28px; letter-spacing:0.02em; }
        @keyframes scroll-left { 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
        @media (prefers-reduced-motion: reduce) { .ticker-track { animation:none; } }
        .app-header { display:flex; align-items:flex-start; justify-content:space-between; padding:18px 16px 12px; border-bottom:1px solid var(--border); background:linear-gradient(180deg,rgba(240,169,0,0.05),transparent); }
        .brand-row { display:flex; align-items:center; gap:8px; }
        .live-pulse { width:7px; height:7px; border-radius:50%; background:var(--up); box-shadow:0 0 0 0 rgba(51,209,126,0.6); animation:pulse 2s infinite; }
        @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(51,209,126,0.5);} 70%{box-shadow:0 0 0 7px rgba(51,209,126,0);} 100%{box-shadow:0 0 0 0 rgba(51,209,126,0);} }
        @media (prefers-reduced-motion: reduce) { .live-pulse { animation:none; } }
        .app-header h1 { font-size:16.5px; font-weight:700; letter-spacing:0.04em; margin:0; white-space:nowrap; background:linear-gradient(90deg,var(--text),var(--amber)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        .brand-tag { font-family:'IBM Plex Mono',monospace; font-size:9.5px; color:var(--text-muted); letter-spacing:0.14em; margin-top:2px; }
        .app-header .sub { font-size:11px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; }
        .user-chip { font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:0.04em; padding:5px 11px; border-radius:20px; border:1px solid var(--border); background:var(--panel-hi); color:var(--text-muted); cursor:pointer; transition:transform 0.12s ease, border-color 0.12s ease; }
        .user-chip:active { transform:scale(0.96); }
        .user-chip.signin { color:var(--amber); border-color:rgba(240,169,0,0.4); }
        .user-chip.admin { color:var(--accent2); border-color:rgba(77,163,255,0.4); background:rgba(77,163,255,0.08); }
        .auth-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; animation:fade-in 0.15s ease; }
        @keyframes fade-in { from{opacity:0;} to{opacity:1;} }
        .auth-modal { background:var(--panel-hi); border:1px solid var(--border); border-radius:14px; padding:20px; width:100%; max-width:340px; box-shadow:0 20px 60px rgba(0,0,0,0.5); animation:rise-in 0.18s ease; }
        @keyframes rise-in { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:translateY(0);} }
        .auth-tabs { display:flex; gap:6px; margin-bottom:14px; background:var(--panel); border-radius:8px; padding:3px; }
        .auth-tabs button { flex:1; padding:8px; border:none; background:none; border-radius:6px; color:var(--text-muted); font-family:'Space Grotesk',sans-serif; font-size:12.5px; cursor:pointer; transition:background 0.15s ease, color 0.15s ease; }
        .auth-tabs button.active { background:var(--amber); color:#000; font-weight:600; }
        .auth-input { width:100%; background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:11px 12px; color:var(--text); font-family:'Space Grotesk',sans-serif; font-size:13px; margin-bottom:10px; box-sizing:border-box; transition:border-color 0.15s ease; }
        .auth-input:focus { outline:none; border-color:var(--amber); }
        .auth-error { color:var(--down); font-size:12px; margin-bottom:10px; }
        .auth-submit { width:100%; background:var(--amber); border:none; border-radius:8px; padding:11px; color:#000; font-weight:600; font-size:13px; cursor:pointer; transition:transform 0.12s ease; }
        .auth-submit:active { transform:scale(0.98); }
        .content { padding:4px 16px 16px; }
        .section-label { margin:22px 0 10px; padding-bottom:8px; border-bottom:1px solid var(--border); }
        .section-label .eyebrow { font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--amber); letter-spacing:0.12em; text-transform:uppercase; }
        .section-label h2 { font-size:15px; font-weight:600; margin:2px 0 0; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .card { position:relative; background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 2px 10px rgba(0,0,0,0.18); transition:border-color 0.15s ease; }
        .card::before { content:''; position:absolute; top:0; left:12px; right:12px; height:1px; background:linear-gradient(90deg,transparent,rgba(240,169,0,0.35),transparent); }
        .card-row { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; transition:transform 0.1s ease; }
        .card-row:active { transform:scale(0.99); }
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
        .empty-note { font-size:11px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; padding:10px 0; }
        .disclaimer { font-size:10.5px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; background:var(--panel); border:1px solid var(--border); border-left:2px solid var(--amber); border-radius:4px; padding:10px 12px; margin:10px 0 4px; line-height:1.6; }
        .disclaimer::before { content:'SYS · '; color:var(--amber); }
        .regime-matrix { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0 4px; }
        .regime-cell { border:1px solid var(--border); border-radius:10px; padding:12px; background:var(--panel); }
        .regime-cell.active { border-color:var(--amber); background:rgba(240,162,2,0.08); }
        .regime-cell .rname { font-weight:600; font-size:13px; margin-bottom:3px; }
        .regime-cell .rsub { font-size:10.5px; color:var(--text-muted); }
        .score-dial { text-align:center; padding:20px 12px; }
        .score-dial .ring { width:104px; height:104px; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; }
        .score-dial .num { font-family:'IBM Plex Mono',monospace; font-size:32px; font-weight:600; background:var(--panel); width:82px; height:82px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .score-dial .lbl { font-size:12px; color:var(--text-muted); margin-top:8px; }
        .news-item { border-bottom:1px solid var(--border); padding:10px 0; }
        .news-item a { color:var(--text); text-decoration:none; font-size:13px; line-height:1.4; }
        .news-item .meta { font-size:10px; color:var(--text-muted); font-family:'IBM Plex Mono',monospace; margin-top:3px; }
        .region-row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--border); font-size:13px; }
        .region-tag { font-family:'IBM Plex Mono',monospace; font-size:10px; padding:2px 8px; border-radius:20px; }
        .region-tag.High { color:var(--down); background:rgba(255,92,92,0.12); }
        .region-tag.Medium { color:var(--amber); background:rgba(240,162,2,0.12); }
        .region-tag.Low { color:var(--up); background:rgba(62,207,142,0.12); }
        .factor-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); font-size:12.5px; }
        .factor-row:last-child { border-bottom:none; }
        .factor-tag { font-family:'IBM Plex Mono',monospace; font-size:10px; padding:2px 8px; border-radius:20px; flex:none; margin-left:8px; }
        .factor-tag.bull { color:var(--up); background:rgba(62,207,142,0.12); }
        .factor-tag.bear { color:var(--down); background:rgba(255,92,92,0.12); }
        .factor-tag.neu { color:var(--text-muted); background:rgba(122,130,144,0.12); }
        .confluence-card { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:12px; }
        .confluence-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .confluence-head .cname { font-weight:600; font-size:14px; }
        .confluence-bar-track { height:6px; border-radius:4px; background:var(--border); overflow:hidden; margin-bottom:10px; }
        .confluence-bar-fill { height:100%; border-radius:4px; }
        .event-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border); }
        .event-row:last-child { border-bottom:none; }
        .event-name { font-size:13px; }
        .event-days { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--amber); }
        .event-days.soon { color:var(--down); }
        .chat-log { display:flex; flex-direction:column; gap:10px; margin:10px 0 70px; }
        .chat-bubble { border-radius:10px; padding:10px 12px; font-size:13px; line-height:1.5; max-width:88%; }
        .chat-bubble.user { align-self:flex-end; background:rgba(240,162,2,0.12); border:1px solid rgba(240,162,2,0.3); }
        .chat-bubble.ai { align-self:flex-start; background:var(--panel); border:1px solid var(--border); white-space:pre-wrap; }
        .chat-input-row { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; display:flex; gap:8px; padding:10px 16px calc(10px + env(safe-area-inset-bottom)); background:var(--bg); border-top:1px solid var(--border); }
        .chat-input-row input { flex:1; background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:10px 12px; color:var(--text); font-family:'Space Grotesk',sans-serif; font-size:13px; }
        .chat-input-row button { background:var(--amber); border:none; border-radius:8px; padding:0 14px; display:flex; align-items:center; justify-content:center; color:#000; cursor:pointer; }
      `}</style>

      <div className="ticker-wrap">
        <div className="ticker-track">
          {tickerItems.length
            ? [...tickerItems, ...tickerItems].map((t, i) => <span key={i}>{t}</span>)
            : <span>loading live tape…</span>}
        </div>
      </div>

      <div className="app-header">
        <div className="brand-row">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div>
            <div className="brand-row" style={{ gap: 6 }}>
              <span className="live-pulse" />
              <h1>MACRO TERMINAL</h1>
            </div>
            <div className="brand-tag">BY VINAY</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="sub">{new Date().toUTCString().slice(0, 22)}</span>
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          {user ? (
            <button className={`user-chip ${user.role === "admin" ? "admin" : ""}`} onClick={doLogout} title="Tap to sign out">
              {user.email.split("@")[0]}{user.role === "admin" ? " · ADMIN" : ""}
            </button>
          ) : (
            <button className="user-chip signin" onClick={() => setAuthOpen(true)}>Sign In</button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="brand-row" style={{ gap: 6 }}>
                <span className="live-pulse" />
                <h1 style={{ fontSize: 16 }}>MACRO TERMINAL</h1>
              </div>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
            </div>
            <div className="drawer-list">
              {NAV_ITEMS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`drawer-item ${tab === id ? "active" : ""}`}
                  onClick={() => { setTab(id); setMenuOpen(false); }}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {authOpen && (
        <div className="auth-overlay" onClick={() => setAuthOpen(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-tabs">
              <button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); }}>Log In</button>
              <button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthError(""); }}>Sign Up</button>
            </div>
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="auth-input"
            />
            <input
              type="password"
              placeholder={authMode === "signup" ? "Password (min 8 characters)" : "Password"}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="auth-input"
              onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }}
            />
            {authError && <div className="auth-error">{authError}</div>}
            <button className="auth-submit" onClick={submitAuth} disabled={authLoading}>
              {authLoading ? "Please wait…" : authMode === "login" ? "Log In" : "Create Account"}
            </button>
          </div>
        </div>
      )}

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

            <div className="macro-cat">Macro Summary</div>
            <div className="confluence-card">
              <div className="confluence-head">
                <div className="cname">Overall Read</div>
                <span className={`factor-tag ${macroOverallBias === "Net Bullish" ? "bull" : macroOverallBias === "Net Bearish" ? "bear" : "neu"}`}>
                  {macroOverallBias}
                </span>
              </div>
              <div className="grid-2" style={{ marginTop: 4 }}>
                <div className="card" style={{ background: "var(--panel-hi)" }}>
                  <div className="card-title">Bullish</div>
                  <div className="card-value" style={{ color: "var(--up)" }}>{macroBiasCounts.Bullish}</div>
                </div>
                <div className="card" style={{ background: "var(--panel-hi)" }}>
                  <div className="card-title">Bearish</div>
                  <div className="card-value" style={{ color: "var(--down)" }}>{macroBiasCounts.Bearish}</div>
                </div>
                <div className="card" style={{ background: "var(--panel-hi)" }}>
                  <div className="card-title">Neutral</div>
                  <div className="card-value" style={{ color: "var(--text-muted)" }}>{macroBiasCounts.Neutral}</div>
                </div>
                <div className="card" style={{ background: "var(--panel-hi)" }}>
                  <div className="card-title">Tracked</div>
                  <div className="card-value">{macroBiasTotal}</div>
                </div>
              </div>
            </div>

            <OverviewGrid title="Macro Overview" ids={MACRO_OVERVIEW_IDS} macroData={macro.data} />
            <OverviewGrid title="Socioeconomic Overview" ids={SOCIO_OVERVIEW_IDS} macroData={macro.data} />
            <OverviewGrid title="Micro Overview" ids={MICRO_OVERVIEW_IDS} macroData={macro.data} />
            <div className="macro-cat">Full Breakdown</div>
            {Object.keys(macroByCategory).map((cat) => (
              <div key={cat}>
                <div className="macro-cat">{cat}</div>
                {macroByCategory[cat].map((m) => {
                  const bias = biasForSeries(m);
                  return (
                    <div className="card-row" key={m.id}>
                      <div className="row-name">
                        <span className={`macro-live-dot ${m.live ? "live" : ""}`} />
                        <div>
                          <div>{m.label}</div>
                          <div className="sym">{m.id}</div>
                        </div>
                      </div>
                      <div className="row-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="price">{m.value} <TrendArrow trend={m.trend} /></div>
                        <span className={`factor-tag ${bias === "Bullish" ? "bull" : bias === "Bearish" ? "bear" : "neu"}`}>{bias}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <p className="empty-note">Dots are amber = placeholder, green = live via your FRED proxy.</p>
            <div className="disclaimer">
              Bullish/Bearish tags are a simple rule-of-thumb read of each series' trend direction
              (e.g. rising CPI or Fed Funds = Bearish for risk assets; rising GDP or Payrolls =
              Bullish). It's a quick heuristic, not a signal — always check the underlying number.
            </div>
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
            <div className="macro-cat">Event Risk</div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="event-row">
                <div className="event-name">Next FOMC decision {nextFomc?.sep ? "(w/ dot plot)" : ""}</div>
                <div className={`event-days ${daysToFomc != null && daysToFomc <= 3 ? "soon" : ""}`}>
                  {nextFomc ? `${daysToFomc}d — ${nextFomc.date}` : "—"}
                </div>
              </div>
              <div className="event-row">
                <div className="event-name">Next CPI print {nextCpi && !nextCpi.confirmed ? "(projected)" : ""}</div>
                <div className={`event-days ${daysToCpi != null && daysToCpi <= 3 ? "soon" : ""}`}>
                  {nextCpi ? `${daysToCpi}d — ${nextCpi.date}` : "—"}
                </div>
              </div>
            </div>
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
              heuristic, unlike Regime and Sentiment. FOMC dates are official; CPI dates beyond the
              confirmed release are BLS's typical second-week pattern and may shift.
            </div>
          </>
        )}

        {tab === "sentiment" && (
          <>
            <SectionLabel eyebrow="Composite">Market Sentiment</SectionLabel>
            <div className="card score-dial">
              <div className="ring" style={{ background: `conic-gradient(${sentimentScore == null ? "var(--border)" : sentimentScore < 40 ? "var(--down)" : sentimentScore > 60 ? "var(--up)" : "var(--amber)"} ${(sentimentScore ?? 0) * 3.6}deg, var(--border) 0deg)` }}>
                <div className="num" style={{ color: sentimentScore == null ? "var(--text-muted)" : sentimentScore < 40 ? "var(--down)" : sentimentScore > 60 ? "var(--up)" : "var(--amber)" }}>
                  {sentimentScore ?? "…"}
                </div>
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
              <div className="ring" style={{ background: `conic-gradient(${!news.data ? "var(--border)" : news.data.riskScore > 65 ? "var(--down)" : news.data.riskScore > 35 ? "var(--amber)" : "var(--up)"} ${(news.data?.riskScore ?? 0) * 3.6}deg, var(--border) 0deg)` }}>
                <div className="num" style={{ color: !news.data ? "var(--text-muted)" : news.data.riskScore > 65 ? "var(--down)" : news.data.riskScore > 35 ? "var(--amber)" : "var(--up)" }}>
                  {news.data ? news.data.riskScore : "…"}
                </div>
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

        {tab === "whales" && (
          <>
            <SectionLabel eyebrow="On-chain, $1M+ transfers">Whale Watch</SectionLabel>
            {whales.error && <p className="empty-note">Whale feed unavailable right now.</p>}
            {!whales.data && !whales.error && <p className="empty-note">Loading recent large transfers…</p>}
            {whales.data && !whales.data.ethEnabled && (
              <p className="empty-note">BTC whale tracking is live. Add ETHERSCAN_API_KEY (free, self-serve at etherscan.io) to also track Ethereum.</p>
            )}
            {whales.data?.transactions?.length === 0 && <p className="empty-note">No $1M+ transfers spotted in the last poll.</p>}
            {whales.data?.transactions?.map((tx) => (
              <div className="card-row" key={`${tx.chain}-${tx.hash}`}>
                <div className="row-name">
                  <span className={`factor-tag ${tx.chain === "bitcoin" ? "bull" : "neu"}`} style={{ marginRight: 4 }}>
                    {tx.chain === "bitcoin" ? "BTC" : "ETH"}
                  </span>
                  <div>
                    <div className="sym">{tx.hash?.slice(0, 10)}…{tx.hash?.slice(-6)}</div>
                    <div className="sym">{tx.pending ? "pending · " : ""}{tx.time}</div>
                  </div>
                </div>
                <div className="row-right"><div className="price">{tx.display}</div></div>
              </div>
            ))}
            <div className="disclaimer">
              Free DIY whale tracker, not the paid Whale Alert service. BTC transfers come from
              blockchain.info's free mempool feed (pending/unconfirmed — the most real-time view without
              a paid indexer). ETH transfers scan the last few blocks via Etherscan's free API. No
              exchange/entity labels (that attribution is exactly what paid services sell) — just raw
              transaction hashes, chain, and USD value.
            </div>
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

        {tab === "fed" && (
          <>
            <SectionLabel eyebrow="Built from FRED trend directions">Fed Hawk-Dove Meter</SectionLabel>
            <div className="card score-dial">
              <div className="ring" style={{ background: `conic-gradient(${hawkLabel === "Hawkish" ? "var(--down)" : hawkLabel === "Dovish" ? "var(--up)" : "var(--amber)"} ${hawkScore * 3.6}deg, var(--border) 0deg)` }}>
                <div className="num" style={{ color: hawkLabel === "Hawkish" ? "var(--down)" : hawkLabel === "Dovish" ? "var(--up)" : "var(--amber)" }}>
                  {hawkScore}
                </div>
              </div>
              <div className="lbl">{hawkLabel}</div>
            </div>

            <div className="macro-cat">Next FOMC Decision</div>
            <div className="card">
              <div className="card-title">{nextFomc ? `${nextFomc.date}${nextFomc.sep ? " (with dot plot)" : ""}` : "No date on file"}</div>
              <div className="card-value" style={{ fontSize: 15 }}>{daysToFomc != null ? `${daysToFomc} day${daysToFomc === 1 ? "" : "s"} away` : "—"}</div>
            </div>

            <div className="macro-cat">What's feeding the score</div>
            <div className="card">
              <div className="factor-row">
                <div>Fed funds rate trend</div>
                <span className={`factor-tag ${fedFundsTrendScore > 0 ? "bear" : fedFundsTrendScore < 0 ? "bull" : "neu"}`}>{fedFunds?.trend ?? "flat"}</span>
              </div>
              <div className="factor-row">
                <div>2Y Treasury yield trend</div>
                <span className={`factor-tag ${dgs2TrendScore > 0 ? "bear" : dgs2TrendScore < 0 ? "bull" : "neu"}`}>{dgs2?.trend ?? "flat"}</span>
              </div>
              <div className="factor-row">
                <div>CPI trend</div>
                <span className={`factor-tag ${cpiTrendScore > 0 ? "bear" : cpiTrendScore < 0 ? "bull" : "neu"}`}>{cpi?.trend ?? "flat"}</span>
              </div>
              <div className="factor-row">
                <div>Financial stress trend</div>
                <span className={`factor-tag ${stressTrendScore < 0 ? "bear" : stressTrendScore > 0 ? "bull" : "neu"}`}>{stlfsi?.trend ?? "flat"}</span>
              </div>
            </div>

            <div className="macro-cat">Asset Impact ({hawkLabel})</div>
            {Object.entries(FED_ASSET_IMPACT[hawkLabel]).map(([asset, note]) => (
              <div className="card-row" key={asset}>
                <div className="row-name"><div>{asset}</div></div>
                <div className="row-right" style={{ maxWidth: 190, fontSize: 12, textAlign: "right" }}>{note}</div>
              </div>
            ))}

            <div className="disclaimer">
              A simple 4-factor average of Fed funds rate, 2Y yield, CPI, and financial-stress trend
              directions from FRED — not the CME FedWatch tool and not an official rate-probability
              model. Treat this as a quick directional read, not a forecast.
            </div>
          </>
        )}

        {tab === "calendar" && (
          <>
            <SectionLabel eyebrow="Official 2026 government release schedule">Economic Calendar</SectionLabel>
            {econCalendar.error && <p className="empty-note">Calendar feed unavailable right now.</p>}
            {!econCalendar.data && !econCalendar.error && <p className="empty-note">Loading upcoming releases…</p>}
            {econCalendar.data?.events?.length === 0 && <p className="empty-note">No upcoming releases found in the next 90 days.</p>}
            {econCalendar.data?.events?.map((ev) => {
              const d = new Date(ev.date);
              const days = Math.ceil((d - today) / 86400000);
              return (
                <div className="event-row" key={`${ev.name}-${ev.date}`} style={{ flexDirection: "column", alignItems: "stretch", gap: 3 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="event-name">{ev.name}</div>
                    <div className={`event-days ${days <= 3 ? "soon" : ""}`}>{days}d — {ev.date}</div>
                  </div>
                  {(ev.previous || ev.forecast || ev.actual) && (
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                      {ev.previous && <span>Previous: {ev.previous}</span>}
                      {ev.forecast && <span style={{ color: "var(--amber)" }}>Forecast: {ev.forecast}</span>}
                      {ev.actual && <span style={{ color: "var(--accent2)" }}>Actual: {ev.actual}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="disclaimer">
              Dates sourced from the official White House/OMB "Schedule of Release Dates for Principal
              Federal Economic Indicators for 2026" (BEA, BLS, Census, and Fed release calendars) — a
              verified static list for the full year, not a live FRED API pull. "Previous" is a real
              FRED reading. {econCalendar.data?.forecastSourceAvailable
                ? "\"Forecast\" and \"Actual\" come from a small third-party scraped calendar service, not an official source — treat these two fields as unverified and cross-check anything you'd trade on."
                : "Forecast/consensus figures require a paid data license or a connected third-party key and aren't included yet."}
              {" "}Government shutdowns or agency notices can still shift a date after publication.
            </div>
          </>
        )}

        {tab === "confluence" && (
          <>
            <SectionLabel eyebrow="Weighted factor scoring">Bull / Bear Confluence</SectionLabel>
            {confluenceBoard.map((c) => (
              <div className="confluence-card" key={c.name}>
                <div className="confluence-head">
                  <div className="cname">{c.name}</div>
                  <span className={`factor-tag ${c.bias === "Bullish" ? "bull" : c.bias === "Bearish" ? "bear" : "neu"}`}>{c.bias} · {c.pct}</span>
                </div>
                <div className="confluence-bar-track">
                  <div
                    className="confluence-bar-fill"
                    style={{
                      width: `${c.pct}%`,
                      background: c.bias === "Bullish" ? "var(--up)" : c.bias === "Bearish" ? "var(--down)" : "var(--amber)",
                    }}
                  />
                </div>
                {c.factors.map((f) => (
                  <div className="factor-row" key={f.label}>
                    <div>{f.label} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>· {f.note}</span></div>
                    <span className={`factor-tag ${f.value > 0 ? "bull" : f.value < 0 ? "bear" : "neu"}`}>
                      {f.value > 0 ? "Bull" : f.value < 0 ? "Bear" : "Neutral"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div className="disclaimer">
              Each score averages 4-5 macro factors already on this dashboard (Fed stance, yields,
              inflation, liquidity, momentum, geopolitical risk) into a 0-100 bull/bear read per asset.
              This is an educational framework I built, not a trading signal — nowhere close to a
              proprietary multi-factor confluence engine, and not investment advice.
            </div>
          </>
        )}

        {tab === "makers" && (
          <>
            <SectionLabel eyebrow="High-impact print reaction reference">Market Makers</SectionLabel>

            <div className="card" style={{ marginBottom: 10, borderColor: "var(--amber)" }}>
              <div className="card-title">Next Market Maker</div>
              <div className="card-value" style={{ fontSize: 20 }}>{nextMarketMaker?.name || "—"}</div>
              <div style={{ fontSize: 12.5, color: "var(--amber)", marginTop: 4 }}>
                {nextMarketMaker?.next ? `${nextMarketMaker.next.days}d — ${nextMarketMaker.next.date}` : "No date on file"}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="card">
                <div className="card-title">Avg Gold 1h Move</div>
                <div className="card-value">±{avgGoldMove1h.toFixed(2)}%</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>across {marketMakerEvents.length} event types</div>
              </div>
              <div className="card">
                <div className="card-title">BTC Beta on Prints</div>
                <div className="card-value">≈{btcBeta}×</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>BTC vs Gold, same surprise</div>
              </div>
            </div>

            <div className="macro-cat">Upcoming Prints</div>
            {marketMakerEvents.map((ev) => (
              <div className="confluence-card" key={ev.id}>
                <div className="confluence-head">
                  <div>
                    <div className="cname">{ev.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{ev.desc}</div>
                  </div>
                  <span className="factor-tag neu">{"★".repeat(ev.stars)}</span>
                </div>
                <div className="factor-row">
                  <div>Latest release ({ev.seriesId})</div>
                  <span>{ev.live ? `${ev.live.value} ${ev.live.trend === "up" ? "↑" : ev.live.trend === "down" ? "↓" : "→"}` : "—"}</span>
                </div>
                <div className="factor-row">
                  <div>Next release</div>
                  <span>{ev.next ? `${ev.next.date}${ev.next.confirmed ? "" : " (projected)"} · ${ev.next.days}d` : "—"}</span>
                </div>
                <div className="factor-row">
                  <div>Gold avg 1h punch</div>
                  <span>±{ev.goldMove.toFixed(2)}%</span>
                </div>
                <div className="confluence-bar-track" style={{ marginBottom: 6 }}>
                  <div className="confluence-bar-fill" style={{ width: `${Math.min(ev.goldMove / 1.2, 1) * 100}%`, background: "var(--amber)" }} />
                </div>
                <div className="factor-row">
                  <div>BTC avg 1h punch</div>
                  <span>±{ev.btcMove.toFixed(2)}%</span>
                </div>
                <div className="confluence-bar-track">
                  <div className="confluence-bar-fill" style={{ width: `${Math.min(ev.btcMove / 2, 1) * 100}%`, background: "#8b7bd8" }} />
                </div>
              </div>
            ))}

            <div className="disclaimer">
              "Latest release" and "Next release" dates are real (FRED + official BLS/Census/Fed
              calendars). The 1-hour gold/BTC reaction estimates are an illustrative desk-lore
              reference for typical post-print volatility — not computed from live tick data (this
              dashboard has no historical intraday feed), so treat them as ballpark, not backtested fact.
            </div>
          </>
        )}

        {tab === "ask" && (
          <>
            <SectionLabel eyebrow="Answers from what's on screen right now">Ask AI</SectionLabel>
            <p className="empty-note">Ask about the live data in this dashboard — Fed stance, regime, sentiment, confluence, geopolitical risk. Needs ANTHROPIC_API_KEY set on the server.</p>
            <div className="chat-log">
              {askLog.map((m, i) => (
                <div className={`chat-bubble ${m.role === "user" ? "user" : "ai"}`} key={i}>{m.text}</div>
              ))}
              {askLoading && <div className="chat-bubble ai">thinking…</div>}
            </div>
          </>
        )}
      </div>

      {tab === "ask" && (
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="e.g. Is the Fed leaning hawkish right now?"
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") askAI(); }}
          />
          <button onClick={askAI} disabled={askLoading}><Send size={16} /></button>
        </div>
      )}
    </div>
  );
}             
