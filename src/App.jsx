import { useState, useCallback, useEffect, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════════════
   EMBEDDED TICKER DATABASE — PER SHARE DATA
   All values are per-share. Sources: public filings.
   Users can always override any value.
   ═══════════════════════════════════════════════════ */
const TICKERS = {
  AAPL:  { name: "Apple Inc.",            currency: "USD", price: 172.50, fcfPS: 6.73,  netDebtPS: -2.10, sector: "Tech" },
  MSFT:  { name: "Microsoft Corp.",       currency: "USD", price: 420.00, fcfPS: 9.50,  netDebtPS: -4.80, sector: "Tech" },
  GOOGL: { name: "Alphabet Inc.",         currency: "USD", price: 155.00, fcfPS: 5.80,  netDebtPS: -8.20, sector: "Tech" },
  AMZN:  { name: "Amazon.com Inc.",       currency: "USD", price: 185.00, fcfPS: 4.70,  netDebtPS: 1.50,  sector: "Tech" },
  NVDA:  { name: "NVIDIA Corp.",          currency: "USD", price: 880.00, fcfPS: 13.20, netDebtPS: -2.90, sector: "Semicon." },
  META:  { name: "Meta Platforms Inc.",    currency: "USD", price: 500.00, fcfPS: 16.90, netDebtPS: -6.30, sector: "Tech" },
  TSLA:  { name: "Tesla Inc.",            currency: "USD", price: 175.00, fcfPS: 1.20,  netDebtPS: -5.80, sector: "Auto" },
  BRK_B: { name: "Berkshire Hathaway B",  currency: "USD", price: 430.00, fcfPS: 22.00, netDebtPS: -45.0, sector: "Finance" },
  JPM:   { name: "JPMorgan Chase & Co.",  currency: "USD", price: 195.00, fcfPS: 18.50, netDebtPS: 85.00, sector: "Finance" },
  V:     { name: "Visa Inc.",             currency: "USD", price: 280.00, fcfPS: 8.90,  netDebtPS: 3.20,  sector: "Finance" },
  JNJ:   { name: "Johnson & Johnson",     currency: "USD", price: 155.00, fcfPS: 7.10,  netDebtPS: 5.60,  sector: "Santé" },
  WMT:   { name: "Walmart Inc.",          currency: "USD", price: 175.00, fcfPS: 3.60,  netDebtPS: 5.80,  sector: "Retail" },
  PG:    { name: "Procter & Gamble",      currency: "USD", price: 162.00, fcfPS: 6.40,  netDebtPS: 10.20, sector: "Conso." },
  MA:    { name: "Mastercard Inc.",        currency: "USD", price: 465.00, fcfPS: 12.80, netDebtPS: 6.50,  sector: "Finance" },
  HD:    { name: "Home Depot Inc.",        currency: "USD", price: 355.00, fcfPS: 16.40, netDebtPS: 29.50, sector: "Retail" },
  KO:    { name: "Coca-Cola Co.",         currency: "USD", price: 60.00,  fcfPS: 2.60,  netDebtPS: 8.20,  sector: "Conso." },
  PEP:   { name: "PepsiCo Inc.",          currency: "USD", price: 170.00, fcfPS: 5.50,  netDebtPS: 18.60, sector: "Conso." },
  COST:  { name: "Costco Wholesale",      currency: "USD", price: 730.00, fcfPS: 14.50, netDebtPS: 2.10,  sector: "Retail" },
  NFLX:  { name: "Netflix Inc.",          currency: "USD", price: 620.00, fcfPS: 15.00, netDebtPS: 4.20,  sector: "Media" },
  DIS:   { name: "Walt Disney Co.",       currency: "USD", price: 112.00, fcfPS: 4.20,  netDebtPS: 18.90, sector: "Media" },
  AMD:   { name: "AMD Inc.",              currency: "USD", price: 165.00, fcfPS: 2.80,  netDebtPS: -2.10, sector: "Semicon." },
  CRM:   { name: "Salesforce Inc.",       currency: "USD", price: 270.00, fcfPS: 9.80,  netDebtPS: 1.80,  sector: "Tech" },
  ADBE:  { name: "Adobe Inc.",            currency: "USD", price: 510.00, fcfPS: 16.20, netDebtPS: 1.50,  sector: "Tech" },
  INTC:  { name: "Intel Corp.",           currency: "USD", price: 32.00,  fcfPS: -1.50, netDebtPS: 8.40,  sector: "Semicon." },
  BA:    { name: "Boeing Co.",            currency: "USD", price: 178.00, fcfPS: -3.20, netDebtPS: 55.00, sector: "Aéro." },
  NKE:   { name: "Nike Inc.",             currency: "USD", price: 95.00,  fcfPS: 3.80,  netDebtPS: 3.60,  sector: "Conso." },
  UBER:  { name: "Uber Technologies",     currency: "USD", price: 72.00,  fcfPS: 2.10,  netDebtPS: 3.50,  sector: "Tech" },
  SQ:    { name: "Block Inc.",            currency: "USD", price: 68.00,  fcfPS: 2.30,  netDebtPS: 1.80,  sector: "Fintech" },
  SPOT:  { name: "Spotify Technology",    currency: "USD", price: 310.00, fcfPS: 5.60,  netDebtPS: -6.20, sector: "Media" },
  PYPL:  { name: "PayPal Holdings",       currency: "USD", price: 68.00,  fcfPS: 5.10,  netDebtPS: -2.80, sector: "Fintech" },
  MC_PA: { name: "LVMH",                 currency: "EUR", price: 780.00, fcfPS: 28.50, netDebtPS: 25.00, sector: "Luxe" },
  OR_PA: { name: "L'Oréal",              currency: "EUR", price: 420.00, fcfPS: 12.30, netDebtPS: 5.60,  sector: "Conso." },
  AI_PA: { name: "Air Liquide",           currency: "EUR", price: 180.00, fcfPS: 7.80,  netDebtPS: 22.50, sector: "Industrie" },
  SAP:   { name: "SAP SE",               currency: "EUR", price: 195.00, fcfPS: 6.10,  netDebtPS: 4.80,  sector: "Tech" },
  ASML:  { name: "ASML Holding",          currency: "EUR", price: 680.00, fcfPS: 18.50, netDebtPS: -8.40, sector: "Semicon." },
  SIE_DE:{ name: "Siemens AG",            currency: "EUR", price: 185.00, fcfPS: 8.90,  netDebtPS: 16.20, sector: "Industrie" },
  RMS_PA:{ name: "Hermès International",  currency: "EUR", price: 2200.00,fcfPS: 45.00, netDebtPS: -55.0, sector: "Luxe" },
  TTE:   { name: "TotalEnergies SE",      currency: "EUR", price: 62.00,  fcfPS: 7.80,  netDebtPS: 5.40,  sector: "Énergie" },
};

const TICKER_LIST = Object.keys(TICKERS);

/* ═══════════════════════════════════════════════════ */

const C = {
  bg: "#07080c",
  surface: "rgba(15,17,24,0.85)",
  card: "rgba(18,21,30,0.92)",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  accent: "#e2b340",
  accentDim: "rgba(226,179,64,0.12)",
  accentGlow: "rgba(226,179,64,0.3)",
  green: "#34d399",
  greenDim: "rgba(52,211,153,0.1)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.1)",
  text: "#f0ede6",
  dim: "#6b6f80",
  mid: "#9499ab",
  input: "rgba(8,10,18,0.8)",
  inputBorder: "rgba(255,255,255,0.08)",
};

const ff = `'DM Sans', 'Outfit', sans-serif`;
const mono = `'JetBrains Mono', 'Fira Code', monospace`;

function Star({ size = 24, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 19.44 12 16.27l-4.18 3.17 1.09-6.27-5.09-3.9 6.09-1.01z" />
    </svg>
  );
}

function fmtP(n, curr = "USD") {
  if (n == null || isNaN(n)) return "—";
  const s = curr === "EUR" ? "€" : curr === "GBP" ? "£" : "$";
  return s + Number(n).toFixed(2);
}

function fmtN(n) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

function AnimatedBG() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(80px,-120px) scale(1.2)} 50%{transform:translate(-60px,80px) scale(0.8)} 75%{transform:translate(100px,40px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-100px,60px) scale(0.9)} 50%{transform:translate(70px,-80px) scale(1.3)} 75%{transform:translate(-40px,-60px) scale(1)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,100px) scale(1.15)} 66%{transform:translate(-80px,-40px) scale(0.85)} }
        @keyframes shimmer { 0%{opacity:0.3} 50%{opacity:0.6} 100%{opacity:0.3} }
        @keyframes gridPulse { 0%,100%{opacity:0.02} 50%{opacity:0.05} }
      `}</style>
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(226,179,64,0.06) 0%, transparent 70%)", animation: "orb1 25s ease-in-out infinite", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", top: "50%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)", animation: "orb2 30s ease-in-out infinite", filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "30%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(226,179,64,0.03) 0%, transparent 60%)", animation: "orb3 20s ease-in-out infinite", filter: "blur(120px)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`, backgroundSize: "40px 40px", animation: "gridPulse 8s ease-in-out infinite" }} />
    </div>
  );
}

function Input({ label, value, onChange, suffix, note, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, display: "block", fontFamily: ff }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.input,
            border: `1.5px solid ${focused ? C.accent : C.inputBorder}`,
            borderRadius: 10, color: C.text, fontSize: 15, fontFamily: mono,
            padding: "11px 14px", paddingRight: suffix ? 44 : 14,
            outline: "none", transition: "border-color 0.25s, box-shadow 0.25s",
            boxShadow: focused ? `0 0 0 3px ${C.accentDim}` : "none",
            opacity: disabled ? 0.4 : 1,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="0"
        />
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.dim, fontSize: 11, fontFamily: mono, fontWeight: 600 }}>{suffix}</span>}
      </div>
      {note && <div style={{ fontSize: 10, color: C.dim, marginTop: 3, fontFamily: ff }}>{note}</div>}
    </div>
  );
}

function Card({ children, style: s, glow }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "22px 24px",
      marginBottom: 16,
      backdropFilter: "blur(20px)",
      boxShadow: glow ? `0 0 40px ${C.accentDim}` : "0 2px 12px rgba(0,0,0,0.3)",
      transition: "box-shadow 0.3s",
      ...s,
    }}>{children}</div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: ff }}>{children}</span>
    </div>
  );
}

function Pill({ label, value, color }) {
  const bg = color === "green" ? C.greenDim : color === "red" ? C.redDim : C.accentDim;
  const fg = color === "green" ? C.green : color === "red" ? C.red : C.accent;
  return (
    <div style={{ background: bg, border: `1px solid ${fg}22`, borderRadius: 10, padding: "12px 18px", flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3, fontFamily: ff }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: fg }}>{value}</div>
    </div>
  );
}

function computeDCF({ fcfPS, netDebtPS, wacc, g1, g2, tg, dilution, margin, years = 10 }) {
  const w = wacc / 100, gr1 = g1 / 100, gr2 = g2 / 100, tgr = tg / 100, dil = dilution / 100;
  const projections = [];
  let currentFCF = fcfPS;
  for (let y = 1; y <= years; y++) {
    const gRate = y <= 5 ? gr1 : gr2;
    currentFCF = currentFCF * (1 + gRate) / (1 + dil);
    const discounted = currentFCF / Math.pow(1 + w, y);
    projections.push({ year: y, fcfPS: currentFCF, discounted, gRate });
  }
  const sumDCF = projections.reduce((s, p) => s + p.discounted, 0);
  const termFCF = currentFCF * (1 + tgr);
  const tv = w > tgr ? termFCF / (w - tgr) : currentFCF * 25;
  const discTV = tv / Math.pow(1 + w, years);
  const fairValue = sumDCF + discTV - netDebtPS;
  const safeValue = fairValue * (1 - margin / 100);
  return { projections, sumDCF, tv, discTV, fairValue, safeValue };
}

export default function DCFApp() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSugg, setShowSugg] = useState(false);

  const [price, setPrice] = useState("");
  const [fcfPS, setFcfPS] = useState("");
  const [netDebtPS, setNetDebtPS] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");

  const [wacc, setWacc] = useState("10");
  const [g1, setG1] = useState("8");
  const [g2, setG2] = useState("5");
  const [tg, setTg] = useState("2.5");
  const [dilution, setDilution] = useState("0");
  const [margin, setMargin] = useState("25");

  const [results, setResults] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [animate, setAnimate] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toUpperCase().trim();
    const matches = TICKER_LIST.filter(t =>
      t.startsWith(q) || TICKERS[t].name.toUpperCase().includes(q)
    ).slice(0, 8);
    setSuggestions(matches);
  }, [query]);

  const loadTicker = useCallback((tk) => {
    const data = TICKERS[tk];
    if (!data) return;
    setSelected(tk);
    setQuery(tk);
    setCompanyName(data.name);
    setCurrency(data.currency);
    setSector(data.sector);
    setPrice(String(data.price));
    setFcfPS(String(data.fcfPS));
    setNetDebtPS(String(data.netDebtPS));
    setShowSugg(false);
    setResults(null);
    setAnimate(false);
    setTimeout(() => setAnimate(true), 50);
  }, []);

  const handleManual = () => {
    const tk = query.trim().toUpperCase();
    setSelected(tk);
    setCompanyName(tk);
    setCurrency("USD");
    setSector("—");
    setShowSugg(false);
    setAnimate(false);
    setTimeout(() => setAnimate(true), 50);
  };

  const calculate = useCallback(() => {
    const params = {
      fcfPS: parseFloat(fcfPS), netDebtPS: parseFloat(netDebtPS) || 0,
      wacc: parseFloat(wacc), g1: parseFloat(g1), g2: parseFloat(g2),
      tg: parseFloat(tg), dilution: parseFloat(dilution) || 0, margin: parseFloat(margin) || 0,
    };
    if (!params.fcfPS || !params.wacc) return;
    setResults(computeDCF(params));
    setShowTable(true);
  }, [fcfPS, netDebtPS, wacc, g1, g2, tg, dilution, margin]);

  const reset = () => {
    setQuery(""); setSelected(null); setCompanyName(""); setPrice("");
    setFcfPS(""); setNetDebtPS(""); setResults(null); setShowTable(false); setAnimate(false);
  };

  const upside = results && price ? ((results.fairValue - parseFloat(price)) / parseFloat(price) * 100) : null;
  const safeUp = results && price ? ((results.safeValue - parseFloat(price)) / parseFloat(price) * 100) : null;

  const containerStyle = {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: ff,
    color: C.text,
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <AnimatedBG />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <div style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "18px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backdropFilter: "blur(24px)", background: "rgba(7,8,12,0.7)",
          position: "sticky", top: 0, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `linear-gradient(135deg, ${C.accent}, #c49525)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 16px ${C.accentDim}`,
            }}>
              <Star size={22} color="#07080c" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>DCF Valuation</div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.06em" }}>INTRINSIC VALUE · PER SHARE</div>
            </div>
          </div>
          {selected && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{companyName}</div>
              <div style={{ fontSize: 11, color: C.accent, fontFamily: mono }}>{selected} · {sector} · {currency}</div>
            </div>
          )}
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 18px 80px" }}>

          {/* SEARCH */}
          <Card>
            <SectionTitle icon="⌕">Rechercher un ticker</SectionTitle>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value.toUpperCase()); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      if (suggestions.length > 0) loadTicker(suggestions[0]);
                      else if (query.trim()) handleManual();
                    }
                  }}
                  placeholder="AAPL, NVDA, LVMH, ASML..."
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: C.input, border: `1.5px solid ${C.inputBorder}`,
                    borderRadius: 12, color: C.text, fontSize: 17, fontFamily: mono,
                    padding: "13px 16px", outline: "none",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    transition: "border-color 0.2s",
                  }}
                />
                {showSugg && suggestions.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    background: "rgba(14,16,24,0.98)", border: `1px solid ${C.border}`,
                    borderRadius: 12, overflow: "hidden", zIndex: 30,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                    backdropFilter: "blur(20px)",
                  }}>
                    {suggestions.map((tk, i) => (
                      <div
                        key={tk}
                        onClick={() => loadTicker(tk)}
                        style={{
                          padding: "11px 16px", cursor: "pointer",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: i === 0 ? C.accentDim : "transparent",
                          borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none",
                          transition: "background 0.15s",
                        }}
                        onMouseOver={e => e.currentTarget.style.background = C.accentDim}
                        onMouseOut={e => e.currentTarget.style.background = i === 0 ? C.accentDim : "transparent"}
                      >
                        <div>
                          <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 14, color: C.accent }}>{tk}</span>
                          <span style={{ color: C.mid, fontSize: 12, marginLeft: 10 }}>{TICKERS[tk].name}</span>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: C.dim, fontFamily: ff, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 6 }}>{TICKERS[tk].sector}</span>
                          <span style={{ fontFamily: mono, fontSize: 13, color: C.text }}>{fmtP(TICKERS[tk].price, TICKERS[tk].currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { if (suggestions.length) loadTicker(suggestions[0]); else if (query.trim()) handleManual(); }}
                style={{
                  background: `linear-gradient(135deg, ${C.accent}, #c49525)`,
                  border: "none", borderRadius: 12, color: "#07080c", fontWeight: 700,
                  fontSize: 14, padding: "0 28px", cursor: "pointer", fontFamily: ff,
                  boxShadow: `0 4px 18px ${C.accentDim}`,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseOver={e => { e.target.style.transform = "translateY(-1px)"; }}
                onMouseOut={e => { e.target.style.transform = "translateY(0)"; }}
              >Charger</button>
              {selected && (
                <button onClick={reset} style={{
                  background: "transparent", border: `1px solid ${C.inputBorder}`,
                  borderRadius: 12, color: C.dim, fontSize: 13, padding: "0 18px",
                  cursor: "pointer", fontFamily: ff, transition: "border-color 0.2s",
                }}
                  onMouseOver={e => e.target.style.borderColor = C.mid}
                  onMouseOut={e => e.target.style.borderColor = C.inputBorder}
                >Reset</button>
              )}
            </div>
            {selected && TICKERS[selected] && (
              <div style={{ marginTop: 10, fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "shimmer 2s ease-in-out infinite" }} />
                Données chargées — tous les champs sont éditables
              </div>
            )}
            {selected && !TICKERS[selected] && (
              <div style={{ marginTop: 10, fontSize: 11, color: C.accent, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block" }} />
                Ticker personnalisé — renseignez les métriques per share
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 10, color: C.dim }}>
              {TICKER_LIST.length} tickers disponibles · Tapez n'importe quel ticker pour le mode manuel
            </div>
          </Card>

          {/* DATA INPUTS */}
          {selected && (
            <div style={{ opacity: animate ? 1 : 0, transform: animate ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)" }}>

              <Card>
                <SectionTitle icon="📊">Métriques Per Share</SectionTitle>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <Input label={`Prix actuel (${currency})`} value={price} onChange={setPrice} suffix={currency === "EUR" ? "€" : "$"} />
                  <Input label="FCF / Action" value={fcfPS} onChange={setFcfPS} suffix={currency === "EUR" ? "€" : "$"} note="Free Cash Flow par action" />
                  <Input label="Dette Nette / Action" value={netDebtPS} onChange={setNetDebtPS} suffix={currency === "EUR" ? "€" : "$"} note="Négatif = trésorerie nette" />
                </div>
              </Card>

              <Card>
                <SectionTitle icon="⚙">Paramètres DCF</SectionTitle>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <Input label="WACC" value={wacc} onChange={setWacc} suffix="%" />
                  <Input label="Croissance Y1-5" value={g1} onChange={setG1} suffix="%" />
                  <Input label="Croissance Y6-10" value={g2} onChange={setG2} suffix="%" />
                  <Input label="Croissance terminale" value={tg} onChange={setTg} suffix="%" />
                </div>
              </Card>

              <Card>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, display: "block" }}>
                      Dilution / Rachat annuel
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number" step="0.5" value={dilution}
                        onChange={e => setDilution(e.target.value)}
                        style={{
                          width: "100%", boxSizing: "border-box", background: C.input,
                          border: `1.5px solid ${C.inputBorder}`, borderRadius: 10,
                          color: C.text, fontSize: 15, fontFamily: mono,
                          padding: "11px 44px 11px 14px", outline: "none",
                          transition: "border-color 0.25s",
                        }}
                      />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.dim, fontSize: 11, fontFamily: mono }}>%/an</span>
                    </div>
                    <div style={{
                      marginTop: 6, fontSize: 11, fontFamily: mono,
                      color: parseFloat(dilution) < 0 ? C.green : parseFloat(dilution) > 0 ? C.red : C.dim,
                    }}>
                      {parseFloat(dilution) < 0 ? "✦ Buyback — FCF/action augmente" :
                       parseFloat(dilution) > 0 ? "⚠ Dilution — FCF/action diminue" : "— Neutre"}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, display: "block" }}>
                      Marge de sécurité
                    </label>
                    <input
                      type="range" min="0" max="50" step="5" value={margin}
                      onChange={e => setMargin(e.target.value)}
                      style={{ width: "100%", accentColor: C.accent, marginTop: 10, cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: C.dim }}>0%</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: C.accent, fontFamily: mono }}>{margin}%</span>
                      <span style={{ fontSize: 10, color: C.dim }}>50%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* CALCULATE */}
              <button onClick={calculate} style={{
                width: "100%", padding: "16px", border: "none", borderRadius: 14,
                background: `linear-gradient(135deg, ${C.accent}, #c49525)`,
                color: "#07080c", fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: ff, letterSpacing: "0.03em", marginBottom: 20,
                boxShadow: `0 6px 30px ${C.accentGlow}`,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
                onMouseOver={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 10px 40px ${C.accentGlow}`; }}
                onMouseOut={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = `0 6px 30px ${C.accentGlow}`; }}
              >
                <Star size={16} color="#07080c" /> &nbsp; Calculer la Valeur Intrinsèque
              </button>

              {/* RESULTS */}
              {results && (
                <div style={{ animation: "fadeUp 0.5s ease-out" }}>
                  <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

                  {/* VERDICT */}
                  <Card glow style={{
                    textAlign: "center", padding: "32px 24px",
                    background: `linear-gradient(135deg, rgba(226,179,64,0.08), rgba(226,179,64,0.02))`,
                    border: `1px solid rgba(226,179,64,0.15)`,
                  }}>
                    <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
                      Valeur Intrinsèque / Action
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 700, fontFamily: mono, color: C.accent, lineHeight: 1 }}>
                      {fmtP(results.fairValue, currency)}
                    </div>
                    {upside !== null && (
                      <div style={{
                        fontSize: 15, marginTop: 10, fontFamily: mono, fontWeight: 600,
                        color: upside > 0 ? C.green : C.red,
                      }}>
                        {upside > 0 ? "▲" : "▼"} {Math.abs(upside).toFixed(1)}% vs {fmtP(parseFloat(price), currency)}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
                      <div style={{ background: C.input, borderRadius: 10, padding: "12px 22px", border: `1px solid ${C.inputBorder}` }}>
                        <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase" }}>Avec marge {margin}%</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: safeUp > 0 ? C.green : C.red }}>
                          {fmtP(results.safeValue, currency)}
                        </div>
                      </div>
                      <div style={{ background: C.input, borderRadius: 10, padding: "12px 22px", border: `1px solid ${C.inputBorder}` }}>
                        <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase" }}>Σ DCF actualisés</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono }}>{fmtP(results.sumDCF, currency)}</div>
                      </div>
                      <div style={{ background: C.input, borderRadius: 10, padding: "12px 22px", border: `1px solid ${C.inputBorder}` }}>
                        <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase" }}>Terminal Value /sh</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono }}>{fmtP(results.discTV, currency)}</div>
                      </div>
                    </div>
                  </Card>

                  {/* SIGNAL PILLS */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                    <Pill
                      label="Signal"
                      value={safeUp > 0 ? "ACHAT" : safeUp > -15 ? "NEUTRE" : "SURVALORISÉ"}
                      color={safeUp > 0 ? "green" : safeUp > -15 ? null : "red"}
                    />
                    <Pill label="Upside Fair" value={(upside > 0 ? "+" : "") + (upside?.toFixed(1) || "—") + "%"} color={upside > 0 ? "green" : "red"} />
                    <Pill label="Upside Safe" value={(safeUp > 0 ? "+" : "") + (safeUp?.toFixed(1) || "—") + "%"} color={safeUp > 0 ? "green" : "red"} />
                  </div>

                  {/* VISUAL BARS */}
                  {price && (
                    <Card>
                      <SectionTitle icon="📈">Comparaison Visuelle</SectionTitle>
                      {[
                        { label: "Prix Actuel", value: parseFloat(price), color: C.mid },
                        { label: `Avec Marge ${margin}%`, value: results.safeValue, color: C.accent },
                        { label: "Fair Value", value: results.fairValue, color: C.green },
                      ].map(bar => {
                        const maxV = Math.max(parseFloat(price), results.fairValue, results.safeValue, 1) * 1.15;
                        const pct = Math.max(0, Math.min(100, (bar.value / maxV) * 100));
                        return (
                          <div key={bar.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 11, color: C.dim }}>{bar.label}</span>
                              <span style={{ fontSize: 14, fontFamily: mono, fontWeight: 600, color: bar.color }}>{fmtP(bar.value, currency)}</span>
                            </div>
                            <div style={{ height: 7, background: C.input, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{
                                width: pct + "%", height: "100%", background: `linear-gradient(90deg, ${bar.color}, ${bar.color}88)`,
                                borderRadius: 4, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  )}

                  {/* PROJECTIONS TABLE */}
                  <Card>
                    <div onClick={() => setShowTable(!showTable)} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      cursor: "pointer", userSelect: "none",
                    }}>
                      <SectionTitle icon="📋">Projections 10 Ans (Per Share)</SectionTitle>
                      <span style={{ fontSize: 18, color: C.dim, transition: "transform 0.3s", transform: showTable ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                    </div>
                    {showTable && (
                      <div style={{ marginTop: 10, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                              {["An.", "Crois.", "FCF/sh", "FCF/sh Act.", "Cumul Act."].map(h => (
                                <th key={h} style={{ padding: "8px 10px", textAlign: "right", color: C.dim, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.projections.map((p, i) => {
                              const cumul = results.projections.slice(0, i + 1).reduce((s, x) => s + x.discounted, 0);
                              return (
                                <tr key={p.year} style={{ borderBottom: `1px solid ${C.border}22` }}>
                                  <td style={{ padding: "7px 10px", textAlign: "right", color: C.mid }}>Y{p.year}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "right", color: p.gRate >= 0 ? C.green : C.red }}>
                                    {(p.gRate * 100).toFixed(1)}%
                                  </td>
                                  <td style={{ padding: "7px 10px", textAlign: "right", color: C.text }}>{fmtN(p.fcfPS)}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "right", color: C.accent }}>{fmtN(p.discounted)}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "right", color: C.mid }}>{fmtN(cumul)}</td>
                                </tr>
                              );
                            })}
                            <tr style={{ borderTop: `2px solid ${C.accent}33` }}>
                              <td colSpan={2} style={{ padding: "9px 10px", textAlign: "right", color: C.accent, fontWeight: 700, fontSize: 11 }}>Terminal /sh</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: C.dim }}>{fmtN(results.tv)}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: C.accent, fontWeight: 700 }}>{fmtN(results.discTV)}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: C.text, fontWeight: 700 }}>{fmtN(results.sumDCF + results.discTV)}</td>
                            </tr>
                            <tr style={{ borderTop: `1px solid ${C.border}` }}>
                              <td colSpan={2} style={{ padding: "9px 10px", textAlign: "right", color: C.red, fontWeight: 700, fontSize: 11 }}>− Dette Nette /sh</td>
                              <td colSpan={2} />
                              <td style={{ padding: "9px 10px", textAlign: "right", color: parseFloat(netDebtPS) > 0 ? C.red : C.green, fontWeight: 700 }}>
                                {parseFloat(netDebtPS) > 0 ? "−" : "+"}{fmtN(Math.abs(parseFloat(netDebtPS) || 0))}
                              </td>
                            </tr>
                            <tr style={{ borderTop: `2px solid ${C.green}44` }}>
                              <td colSpan={2} style={{ padding: "10px 10px", textAlign: "right", color: C.green, fontWeight: 700, fontSize: 12 }}>= FAIR VALUE /sh</td>
                              <td colSpan={2} />
                              <td style={{ padding: "10px 10px", textAlign: "right", color: C.green, fontWeight: 700, fontSize: 16 }}>
                                {fmtP(results.fairValue, currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>

                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div style={{ textAlign: "center", marginTop: 36, fontSize: 10, color: C.dim, lineHeight: 1.7 }}>
            <Star size={14} color={C.dim} />
            <br />
            DCF Valuation · {TICKER_LIST.length} tickers intégrés · Toutes métriques per share
            <br />
            Ceci n'est pas un conseil d'investissement.
          </div>
        </div>
      </div>
    </div>
  );
}
