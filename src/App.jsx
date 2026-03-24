import { useState, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   CONFIG — Finnhub.io
   ═══════════════════════════════════════════ */
const API_KEY = "d70v4chr01ql6rg0ov1gd70v4chr01ql6rg0ov20";
const BASE = "https://finnhub.io/api/v1";

/* ═══════════════════════════════════════════
   POPULAR TICKERS (suggestions rapides)
   ═══════════════════════════════════════════ */
const POPULAR = [
  "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","BRK-B","JPM","V",
  "JNJ","WMT","PG","MA","HD","KO","PEP","COST","NFLX","DIS",
  "AMD","CRM","ADBE","INTC","BA","NKE","UBER","SQ","SPOT","PYPL",
  "ORCL","CSCO","QCOM","TXN","AVGO","MU","AMAT","LRCX","KLAC","MRVL",
  "UNH","LLY","PFE","ABBV","MRK","TMO","ABT","DHR","BMY","AMGN",
  "BLK","GS","MS","AXP","SCHW","C","BAC","WFC","USB","PNC",
  "XOM","CVX","COP","SLB","EOG","MPC","PSX","VLO","OXY","DVN",
  "LMT","RTX","GD","NOC","GE","HON","CAT","DE","MMM","EMR",
  "SBUX","MCD","YUM","CMG","DPZ","WYNN","MAR","HLT","LVS","MGM",
  "T","VZ","TMUS","CMCSA","CHTR","PARA","WBD","FOX","NWSA","EA",
  "F","GM","TM","RIVN","LCID","NIO","XPEV","LI","RACE","STLA",
  "SNOW","PLTR","CRWD","ZS","NET","DDOG","MDB","PANW","FTNT","OKTA",
  "SHW","APD","ECL","DD","LIN","FCX","NEM","ALB","VALE","RIO",
  "TSM","ASML","SAP","SNY","NVO","AZN","GSK","BTI","UL","DEO",
  "WM","RSG","ODFL","UPS","FDX","DAL","UAL","LUV","AAL","JBLU",
];

/* ═══════════════════════════════════════════
   COLORS & DESIGN SYSTEM
   ═══════════════════════════════════════════ */
const C = {
  bg: "#05030e",
  surface: "rgba(10,8,22,0.9)",
  card: "rgba(14,11,28,0.92)",
  border: "rgba(180,140,255,0.06)",
  accent: "#b388ff",
  accentDim: "rgba(179,136,255,0.12)",
  accentGlow: "rgba(179,136,255,0.3)",
  green: "#34d399",
  greenDim: "rgba(52,211,153,0.1)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.1)",
  text: "#ede8f5",
  dim: "#5c5478",
  mid: "#9990b3",
  input: "rgba(8,5,18,0.85)",
  inputBorder: "rgba(180,140,255,0.1)",
  blue: "#818cf8",
};

const ff = `'Outfit', 'Space Grotesk', system-ui, sans-serif`;
const mono = `'JetBrains Mono', 'Fira Code', monospace`;

/* ═══════════════════════════════════════════
   API FUNCTIONS — Finnhub.io
   ═══════════════════════════════════════════ */
async function apiFetch(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.error) return null;
    return d;
  } catch { return null; }
}

async function searchTickers(q) {
  const d = await apiFetch(`${BASE}/search?q=${q}&token=${API_KEY}`);
  if (!d?.result) return [];
  return d.result
    .filter(r => r.type === "Common Stock" || r.type === "ADR" || r.type === "EQS")
    .slice(0, 8)
    .map(r => ({ symbol: r.symbol, name: r.description || "" }));
}

async function loadTickerData(ticker) {
  // 3 parallel calls: quote, profile, basic financials (117 metrics)
  const [quote, profile, financials] = await Promise.all([
    apiFetch(`${BASE}/quote?symbol=${ticker}&token=${API_KEY}`),
    apiFetch(`${BASE}/stock/profile2?symbol=${ticker}&token=${API_KEY}`),
    apiFetch(`${BASE}/stock/metric?symbol=${ticker}&metric=all&token=${API_KEY}`),
  ]);

  // Need at least quote with a price
  const price = quote?.c || profile?.marketCapitalization && null;
  if (!price || price === 0) return null;

  const m = financials?.metric || {};
  const mktCap = (profile?.marketCapitalization || 0) * 1e6; // Finnhub returns in millions
  const sharesOut = profile?.shareOutstanding ? profile.shareOutstanding * 1e6 : null;

  // FCF per share — Finnhub metric key: freeCashFlowPerShareTTM or freeCashFlowPerShareAnnual
  let fcfPS = m.freeCashFlowPerShareTTM ?? m.freeCashFlowPerShareAnnual ?? null;

  // Net debt per share — compute from metrics if available
  // Finnhub provides: netDebtAnnual, currentDebt, totalDebt, cashAndShortTermInvestments
  let netDebtPS = null;
  if (m.netDebtAnnual != null && sharesOut) {
    netDebtPS = (m.netDebtAnnual * 1e6) / sharesOut;
  } else if (m.totalDebtToEquityAnnual != null && m.bookValuePerShareAnnual != null) {
    // Rough approximation: netDebt ≈ totalDebt - cash, but use what's available
    const longTermDebt = m.longTermDebtToEquityAnnual || 0;
    const bvps = m.bookValuePerShareAnnual || 0;
    if (m.currentRatioAnnual && bvps) {
      netDebtPS = null; // better to leave null than give wrong number
    }
  }

  return {
    ticker: ticker.toUpperCase(),
    name: profile?.name || ticker,
    currency: profile?.currency || "USD",
    price: quote?.c || null,
    sector: profile?.finnhubIndustry || "—",
    industry: profile?.finnhubIndustry || "—",
    country: profile?.country || "—",
    exchange: profile?.exchange || "—",
    marketCap: mktCap || null,
    sharesOut,
    fcfPS,
    netDebtPS,
    roic: m.roiTTM != null ? m.roiTTM / 100 : null,
    peRatio: m.peTTM ?? m.peAnnual ?? null,
    pbRatio: m.pbAnnual ?? m.pbQuarterly ?? null,
    dividendYield: m.dividendYieldIndicatedAnnual != null ? m.dividendYieldIndicatedAnnual / 100 : null,
    revenuePS: m.revenuePerShareTTM ?? m.revenuePerShareAnnual ?? null,
    description: profile?.name ? `${profile.name} — ${profile.finnhubIndustry || ""}, ${profile.country || ""}. IPO: ${profile.ipo || "—"}.` : "",
    image: profile?.logo || null,
  };
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function fmtP(n, c = "USD") {
  if (n == null || isNaN(n)) return "—";
  const s = c === "EUR" ? "€" : c === "GBP" ? "£" : c === "JPY" ? "¥" : c === "CHF" ? "CHF " : "$";
  return s + Number(n).toFixed(2);
}
function fmtN(n) { return n == null || isNaN(n) ? "—" : Number(n).toFixed(2); }
function fmtBig(n) {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n/1e12).toFixed(1) + "T";
  if (a >= 1e9) return (n/1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n/1e6).toFixed(1) + "M";
  return n.toFixed(0);
}
function fmtPct(n) { return n == null || isNaN(n) ? "—" : (n * 100).toFixed(1) + "%"; }

/* ═══════════════════════════════════════════
   DCF COMPUTE (per share)
   ═══════════════════════════════════════════ */
function computeDCF({ fcfPS, netDebtPS, wacc, g1, g2, tg, dilution, margin }) {
  const w = wacc / 100, gr1 = g1 / 100, gr2 = g2 / 100, tgr = tg / 100, dil = dilution / 100;
  const projections = [];
  let cur = fcfPS;
  for (let y = 1; y <= 10; y++) {
    const gRate = y <= 5 ? gr1 : gr2;
    cur = cur * (1 + gRate) / (1 + dil);
    const disc = cur / Math.pow(1 + w, y);
    projections.push({ year: y, fcfPS: cur, discounted: disc, gRate });
  }
  const sumDCF = projections.reduce((s, p) => s + p.discounted, 0);
  const termFCF = cur * (1 + tgr);
  const tv = w > tgr ? termFCF / (w - tgr) : cur * 25;
  const discTV = tv / Math.pow(1 + w, 10);
  const fairValue = sumDCF + discTV - (netDebtPS || 0);
  const safeValue = fairValue * (1 - margin / 100);
  return { projections, sumDCF, tv, discTV, fairValue, safeValue };
}

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */
function Star({ size = 24, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ultra-fine 4-point star with ornate wisps */}
      <path d="M50 0 Q50.8 44 52 48 Q56 49.2 100 50 Q56 50.8 52 52 Q50.8 56 50 100 Q49.2 56 48 52 Q44 50.8 0 50 Q44 49.2 48 48 Q49.2 44 50 0Z" fill={color} opacity="0.85"/>
      {/* Inner glow */}
      <path d="M50 15 Q50.4 46 51 49 Q54 49.6 85 50 Q54 50.4 51 51 Q50.4 54 50 85 Q49.6 54 49 51 Q46 50.4 15 50 Q46 49.6 49 49 Q49.6 46 50 15Z" fill={color} opacity="0.3"/>
      {/* Diagonal fine wisps */}
      <line x1="26" y1="26" x2="42" y2="42" stroke={color} strokeWidth="0.5" opacity="0.35"/>
      <line x1="58" y1="58" x2="74" y2="74" stroke={color} strokeWidth="0.5" opacity="0.35"/>
      <line x1="74" y1="26" x2="58" y2="42" stroke={color} strokeWidth="0.5" opacity="0.35"/>
      <line x1="26" y1="74" x2="42" y2="58" stroke={color} strokeWidth="0.5" opacity="0.35"/>
      {/* Micro center */}
      <circle cx="50" cy="50" r="2.5" fill={color} opacity="0.7"/>
      <circle cx="50" cy="50" r="5" fill="none" stroke={color} strokeWidth="0.3" opacity="0.25"/>
    </svg>
  );
}

function AnimBG() {
  const starsRef = useRef(null);
  useEffect(() => {
    if (!starsRef.current) return;
    const canvas = starsRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // Generate stars
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      speed: Math.random() * 0.15 + 0.02,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.01 + 0.003,
    }));

    // Shooting stars
    let shooters = [];
    const maybeShoot = () => {
      if (Math.random() < 0.003 && shooters.length < 2) {
        shooters.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.4,
          vx: (Math.random() - 0.3) * 6,
          vy: Math.random() * 3 + 2,
          life: 1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars
      stars.forEach(s => {
        s.pulse += s.pulseSpeed;
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        const opacity = 0.3 + Math.sin(s.pulse) * 0.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,255,${opacity})`;
        ctx.fill();
      });

      // Shooting stars
      maybeShoot();
      shooters = shooters.filter(s => {
        s.x += s.vx; s.y += s.vy; s.life -= 0.015;
        if (s.life <= 0) return false;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
        ctx.strokeStyle = `rgba(179,136,255,${s.life * 0.6})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        return true;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        @keyframes neb1{0%,100%{transform:translate(0,0) scale(1) rotate(0deg)}25%{transform:translate(80px,-100px) scale(1.2) rotate(5deg)}50%{transform:translate(-60px,80px) scale(0.8) rotate(-3deg)}75%{transform:translate(100px,30px) scale(1.1) rotate(2deg)}}
        @keyframes neb2{0%,100%{transform:translate(0,0) scale(1) rotate(0deg)}33%{transform:translate(-100px,60px) scale(1.3) rotate(-4deg)}66%{transform:translate(70px,-80px) scale(0.9) rotate(6deg)}}
        @keyframes neb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,80px) scale(1.15)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>
      {/* Canvas for stars */}
      <canvas ref={starsRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />
      {/* Nebulae */}
      <div style={{ position:"absolute",top:"0%",left:"5%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(120,60,200,0.06) 0%,rgba(80,40,180,0.02) 40%,transparent 70%)",animation:"neb1 35s ease-in-out infinite",filter:"blur(80px)" }}/>
      <div style={{ position:"absolute",top:"40%",right:"0%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(179,136,255,0.05) 0%,rgba(100,60,220,0.02) 40%,transparent 70%)",animation:"neb2 28s ease-in-out infinite",filter:"blur(100px)" }}/>
      <div style={{ position:"absolute",bottom:"0%",left:"20%",width:800,height:800,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(60,20,120,0.06) 0%,rgba(40,10,80,0.02) 40%,transparent 60%)",animation:"neb3 24s ease-in-out infinite",filter:"blur(120px)" }}/>
      {/* Subtle purple haze at top */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(100,50,180,0.04) 0%,transparent 100%)" }}/>
    </div>
  );
}

function Input({ label, value, onChange, suffix, note, wide }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ flex: wide ? 2 : 1, minWidth: wide ? 200 : 120 }}>
      <label style={{ fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5,display:"block",fontFamily:ff }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input type="number" step="any" value={value} onChange={e => onChange(e.target.value)} placeholder="0"
          style={{ width:"100%",boxSizing:"border-box",background:C.input,border:`1.5px solid ${f?C.accent:C.inputBorder}`,borderRadius:10,color:C.text,fontSize:15,fontFamily:mono,padding:"11px 14px",paddingRight:suffix?44:14,outline:"none",transition:"all 0.25s",boxShadow:f?`0 0 0 3px ${C.accentDim}`:"none" }}
          onFocus={()=>setF(true)} onBlur={()=>setF(false)} />
        {suffix && <span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:C.dim,fontSize:11,fontFamily:mono,fontWeight:600 }}>{suffix}</span>}
      </div>
      {note && <div style={{ fontSize:10,color:C.dim,marginTop:3 }}>{note}</div>}
    </div>
  );
}

function Card({ children, style: s, glow, anim, delay }) {
  return (
    <div style={{
      background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
      padding:"22px 24px", marginBottom:16, backdropFilter:"blur(20px)",
      boxShadow: glow ? `0 0 50px ${C.accentDim}` : "0 2px 16px rgba(0,0,0,0.3)",
      animation: anim ? `slideUp 0.6s ease-out ${delay||"0s"} both` : "none",
      ...s
    }}>{children}</div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:6,
      background: color === "green" ? C.greenDim : color === "red" ? C.redDim : color === "blue" ? "rgba(96,165,250,0.1)" : C.accentDim,
      color: color === "green" ? C.green : color === "red" ? C.red : color === "blue" ? C.blue : C.accent,
      fontFamily:ff, letterSpacing:"0.03em",
    }}>{children}</span>
  );
}

function Pill({ label, value, color, small }) {
  const bg = color==="green"?C.greenDim:color==="red"?C.redDim:C.accentDim;
  const fg = color==="green"?C.green:color==="red"?C.red:C.accent;
  return (
    <div style={{ background:bg,border:`1px solid ${fg}22`,borderRadius:12,padding:small?"10px 14px":"14px 20px",flex:1,minWidth:small?90:110 }}>
      <div style={{ fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3,fontFamily:ff }}>{label}</div>
      <div style={{ fontSize:small?16:20,fontWeight:700,fontFamily:mono,color:fg }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGES
   ═══════════════════════════════════════════ */
const PAGE = { HOME: 0, ANALYSIS: 1, RESULTS: 2 };

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function DCFApp() {
  const [page, setPage] = useState(PAGE.HOME);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Per share inputs
  const [price, setPrice] = useState("");
  const [fcfPS, setFcfPS] = useState("");
  const [netDebtPS, setNetDebtPS] = useState("");
  const [currency, setCurrency] = useState("USD");

  // DCF params
  const [wacc, setWacc] = useState("10");
  const [g1, setG1] = useState("8");
  const [g2, setG2] = useState("5");
  const [tg, setTg] = useState("2.5");
  const [dilution, setDilution] = useState("0");
  const [margin, setMargin] = useState("25");

  // Results
  const [results, setResults] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const searchTimeout = useRef(null);

  // Search suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 1) { setSuggestions([]); return; }
    const q = query.toUpperCase().trim();
    // Filter popular first
    const local = POPULAR.filter(t => t.startsWith(q)).slice(0, 6);
    setSuggestions(local.map(t => ({ symbol: t, name: "" })));

    // Then search API if less results
    clearTimeout(searchTimeout.current);
    if (query.length >= 2) {
      searchTimeout.current = setTimeout(async () => {
        const apiResults = await searchTickers(q);
        if (apiResults?.length) {
          const merged = [...local.map(t => ({ symbol: t, name: "" }))];
          apiResults.forEach(r => {
            if (!merged.find(m => m.symbol === r.symbol)) {
              merged.push({ symbol: r.symbol, name: r.name || "" });
            }
          });
          setSuggestions(merged.slice(0, 8));
        }
      }, 300);
    }
  }, [query]);

  const handleLoad = useCallback(async (ticker) => {
    const tk = (ticker || query).trim().toUpperCase();
    if (!tk) return;
    setLoading(true);
    setError("");
    setQuery(tk);
    setShowSugg(false);

    const result = await loadTickerData(tk);
    if (result) {
      setData(result);
      setCurrency(result.currency || "USD");
      setPrice(String(result.price || ""));
      setFcfPS(result.fcfPS != null ? String(Number(result.fcfPS).toFixed(2)) : "");
      setNetDebtPS(result.netDebtPS != null ? String(Number(result.netDebtPS).toFixed(2)) : "");
      setResults(null);
      setPage(PAGE.ANALYSIS);
      // Warn if some data is missing
      if (result.fcfPS == null || result.netDebtPS == null) {
        setError("Certaines données manquent — complétez manuellement les champs vides.");
      }
    } else {
      // Fallback: open analysis page in full manual mode
      setData({
        ticker: tk, name: tk, currency: "USD", price: null,
        sector: "—", industry: "—", country: "—", exchange: "—",
        marketCap: null, sharesOut: null, fcfPS: null, netDebtPS: null,
        roic: null, peRatio: null, pbRatio: null, dividendYield: null,
        revenuePS: null, description: "", image: null,
      });
      setCurrency("USD");
      setPrice(""); setFcfPS(""); setNetDebtPS("");
      setResults(null);
      setPage(PAGE.ANALYSIS);
      setError("API indisponible pour ce ticker — renseignez les données manuellement.");
    }
    setLoading(false);
  }, [query]);

  const handleCalculate = useCallback(() => {
    const f = parseFloat(fcfPS), w = parseFloat(wacc);
    if (!f || !w) { setError("FCF/share et WACC sont requis."); return; }
    setError("");
    const r = computeDCF({
      fcfPS: f, netDebtPS: parseFloat(netDebtPS) || 0,
      wacc: w, g1: parseFloat(g1), g2: parseFloat(g2),
      tg: parseFloat(tg), dilution: parseFloat(dilution) || 0, margin: parseFloat(margin) || 0,
    });
    setResults(r);
    setShowTable(true);
    setPage(PAGE.RESULTS);
  }, [fcfPS, netDebtPS, wacc, g1, g2, tg, dilution, margin]);

  const handleReset = () => {
    setQuery(""); setData(null); setPrice(""); setFcfPS(""); setNetDebtPS("");
    setResults(null); setShowTable(false); setError(""); setPage(PAGE.HOME);
  };

  const upside = results && price ? ((results.fairValue - parseFloat(price)) / parseFloat(price) * 100) : null;
  const safeUp = results && price ? ((results.safeValue - parseFloat(price)) / parseFloat(price) * 100) : null;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:ff, color:C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <AnimBG />

      <div style={{ position:"relative", zIndex:1 }}>

        {/* ═══ HEADER ═══ */}
        <div style={{
          borderBottom:`1px solid ${C.border}`, padding:"16px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          backdropFilter:"blur(24px)", background:"rgba(5,3,14,0.75)",
          position:"sticky", top:0, zIndex:20,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={handleReset}>
            <div style={{
              width:38, height:38, borderRadius:12,
              background:`linear-gradient(135deg,${C.accent},#7c3aed)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 4px 20px ${C.accentDim}`,
            }}>
              <Star size={22} color="#05030e" />
            </div>
            <div>
              <div style={{ fontSize:16,fontWeight:700,letterSpacing:"-0.03em" }}>DCF Valuation</div>
              <div style={{ fontSize:9,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase" }}>Live Data · Per Share</div>
            </div>
          </div>

          {/* Nav dots */}
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {["Recherche","Analyse","Résultats"].map((l,i) => (
              <div key={l} onClick={() => { if (i <= page) setPage(i === 0 ? PAGE.HOME : i === 1 && data ? PAGE.ANALYSIS : page); }}
                style={{
                  display:"flex", alignItems:"center", gap:5, cursor: i <= page ? "pointer" : "default",
                  opacity: i <= page ? 1 : 0.3,
                }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%",
                  background: i === page ? C.accent : i < page ? C.green : C.dim,
                  transition:"all 0.3s",
                  boxShadow: i === page ? `0 0 8px ${C.accentGlow}` : "none",
                }} />
                <span style={{ fontSize:10, color: i === page ? C.accent : C.dim, fontWeight:600, display: window.innerWidth < 500 ? "none" : "inline" }}>{l}</span>
                {i < 2 && <span style={{ color:C.dim, fontSize:10, margin:"0 2px" }}>›</span>}
              </div>
            ))}
          </div>

          {data && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14,fontWeight:700 }}>{data.name?.substring(0,25)}</div>
              <div style={{ fontSize:11,color:C.accent,fontFamily:mono }}>{data.ticker} · {data.exchange}</div>
            </div>
          )}
        </div>

        <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 80px" }}>

          {/* ═══════════════════════════════════════
              PAGE: HOME
              ═══════════════════════════════════════ */}
          {page === PAGE.HOME && (
            <div style={{ animation:"fadeIn 0.6s ease-out" }}>
              {/* Hero */}
              <div style={{ textAlign:"center", padding:"80px 0 50px" }}>
                <div style={{ display:"inline-flex", marginBottom:24 }}>
                  <div style={{
                    width:64, height:64, borderRadius:18,
                    background:`linear-gradient(135deg,${C.accent},#7c3aed)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 8px 40px ${C.accentGlow}`,
                  }}>
                    <Star size={38} color="#05030e" />
                  </div>
                </div>
                <h1 style={{ fontSize:32, fontWeight:700, letterSpacing:"-0.04em", margin:0, lineHeight:1.1 }}>
                  DCF <span style={{ color:C.accent }}>Valuation</span>
                </h1>
                <p style={{ color:C.dim, fontSize:14, marginTop:10, maxWidth:400, marginLeft:"auto", marginRight:"auto", lineHeight:1.6 }}>
                  Valeur intrinsèque per share · Données temps réel · Calcul DCF complet
                </p>
              </div>

              {/* Search */}
              <Card anim delay="0.1s">
                <div style={{ position:"relative" }}>
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={{ flex:1, position:"relative" }}>
                      <input
                        type="text" value={query}
                        onChange={e => { setQuery(e.target.value.toUpperCase()); setShowSugg(true); }}
                        onFocus={() => setShowSugg(true)}
                        onKeyDown={e => { if (e.key === "Enter") handleLoad(); }}
                        placeholder="Rechercher un ticker... AAPL, NVDA, ASML"
                        style={{
                          width:"100%", boxSizing:"border-box", background:C.input,
                          border:`1.5px solid ${C.inputBorder}`, borderRadius:14,
                          color:C.text, fontSize:18, fontFamily:mono, padding:"16px 20px",
                          outline:"none", textTransform:"uppercase", letterSpacing:"0.04em",
                        }}
                        onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                      />
                      {showSugg && suggestions.length > 0 && (
                        <div style={{
                          position:"absolute", top:"calc(100% + 8px)", left:0, right:0,
                          background:"rgba(10,8,22,0.98)", border:`1px solid ${C.border}`,
                          borderRadius:14, overflow:"hidden", zIndex:30,
                          boxShadow:"0 16px 48px rgba(0,0,0,0.7)", backdropFilter:"blur(20px)",
                          maxHeight:320, overflowY:"auto",
                        }}>
                          {suggestions.map((s, i) => (
                            <div key={s.symbol} onClick={() => handleLoad(s.symbol)}
                              style={{
                                padding:"12px 18px", cursor:"pointer",
                                display:"flex", justifyContent:"space-between", alignItems:"center",
                                borderBottom: i < suggestions.length-1 ? `1px solid ${C.border}` : "none",
                                transition:"background 0.15s",
                              }}
                              onMouseOver={e => e.currentTarget.style.background = C.accentDim}
                              onMouseOut={e => e.currentTarget.style.background = "transparent"}
                            >
                              <div>
                                <span style={{ fontFamily:mono,fontWeight:700,fontSize:14,color:C.accent }}>{s.symbol}</span>
                                {s.name && <span style={{ color:C.mid,fontSize:12,marginLeft:10 }}>{s.name.substring(0,40)}</span>}
                              </div>
                              <span style={{ fontSize:18, color:C.dim }}>→</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleLoad()} disabled={loading}
                      style={{
                        background: loading
                          ? `linear-gradient(90deg,${C.accent}66,${C.accent}33,${C.accent}66)`
                          : `linear-gradient(135deg,${C.accent},#7c3aed)`,
                        backgroundSize: loading ? "200% 100%" : "100% 100%",
                        animation: loading ? "shimmer 1.5s linear infinite" : "none",
                        border:"none", borderRadius:14, color:"#05030e", fontWeight:700,
                        fontSize:15, padding:"0 32px", cursor:loading?"wait":"pointer",
                        fontFamily:ff, boxShadow:`0 4px 20px ${C.accentDim}`,
                        transition:"transform 0.15s", minWidth:120,
                      }}
                      onMouseOver={e => !loading && (e.target.style.transform = "translateY(-1px)")}
                      onMouseOut={e => e.target.style.transform = "translateY(0)"}
                    >{loading ? "Chargement..." : "Analyser"}</button>
                  </div>
                  {error && <div style={{ marginTop:12,fontSize:12,color:C.red }}>{error}</div>}
                </div>
              </Card>

              {/* Popular tickers — compact */}
              <Card anim delay="0.2s">
                <div style={{ fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12 }}>
                  Accès rapide
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {POPULAR.slice(0, 20).map(t => (
                    <button key={t} onClick={() => handleLoad(t)}
                      style={{
                        background:C.input, border:`1px solid ${C.inputBorder}`,
                        borderRadius:8, padding:"7px 14px", cursor:"pointer",
                        color:C.mid, fontSize:12, fontFamily:mono, fontWeight:600,
                        transition:"all 0.2s",
                      }}
                      onMouseOver={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; e.target.style.background = C.accentDim; }}
                      onMouseOut={e => { e.target.style.borderColor = C.inputBorder; e.target.style.color = C.mid; e.target.style.background = C.input; }}
                    >{t}</button>
                  ))}
                </div>
                <div style={{ fontSize:10, color:C.dim, marginTop:10 }}>
                  {POPULAR.length}+ tickers en suggestion · recherche illimitée via Finnhub
                </div>
              </Card>

              {/* Minimal feature line */}
              <div style={{ display:"flex", justifyContent:"center", gap:28, padding:"20px 0 0", animation:"slideUp 0.6s ease-out 0.3s both" }}>
                {[
                  { icon:"⚡", label:"Live Data" },
                  { icon:"📊", label:"Per Share" },
                  { icon:"🛡", label:"Marge de sécurité" },
                ].map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.dim }}>
                    <span style={{ fontSize:16 }}>{f.icon}</span>
                    <span style={{ fontWeight:600 }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              PAGE: ANALYSIS
              ═══════════════════════════════════════ */}
          {page === PAGE.ANALYSIS && data && (
            <div style={{ animation:"fadeIn 0.5s ease-out" }}>

              {/* Company header */}
              <Card anim delay="0s" style={{
                background:`linear-gradient(135deg,rgba(179,136,255,0.06),rgba(179,136,255,0.01))`,
                border:`1px solid rgba(179,136,255,0.12)`,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <h2 style={{ fontSize:24, fontWeight:700, margin:0, letterSpacing:"-0.03em" }}>{data.name}</h2>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                      <Tag>{data.ticker}</Tag>
                      <Tag color="blue">{data.exchange}</Tag>
                      {data.sector !== "—" && <Tag>{data.sector}</Tag>}
                      {data.country !== "—" && <Tag>{data.country}</Tag>}
                    </div>
                    {data.description && (
                      <p style={{ fontSize:12, color:C.dim, lineHeight:1.5, maxWidth:500, margin:0, marginTop:6 }}>
                        {data.description.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:32, fontWeight:700, fontFamily:mono, color:C.accent }}>
                      {fmtP(data.price, currency)}
                    </div>
                    <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>Market Cap: {fmtBig(data.marketCap)}</div>
                  </div>
                </div>

                {/* Key ratios */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:16 }}>
                  {[
                    { l:"P/E", v: data.peRatio != null ? Number(data.peRatio).toFixed(1) : "—" },
                    { l:"P/B", v: data.pbRatio != null ? Number(data.pbRatio).toFixed(1) : "—" },
                    { l:"ROIC", v: fmtPct(data.roic) },
                    { l:"Div. Yield", v: data.dividendYield != null ? fmtPct(data.dividendYield) : "—" },
                    { l:"Rev/Share", v: data.revenuePS != null ? fmtP(data.revenuePS, currency) : "—" },
                  ].map(r => (
                    <div key={r.l} style={{ background:C.input, borderRadius:10, padding:"10px 16px", border:`1px solid ${C.inputBorder}`, flex:1, minWidth:80, textAlign:"center" }}>
                      <div style={{ fontSize:9, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>{r.l}</div>
                      <div style={{ fontSize:15, fontWeight:700, fontFamily:mono, marginTop:2, color:C.text }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Per share inputs */}
              <Card anim delay="0.1s">
                <div style={{ fontSize:11,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"pulse 2s ease-in-out infinite" }}/>
                  Métriques Per Share · Données Live · Éditables
                </div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <Input label={`Prix (${currency})`} value={price} onChange={setPrice} suffix={currency==="EUR"?"€":"$"} />
                  <Input label="FCF / Action" value={fcfPS} onChange={setFcfPS} suffix={currency==="EUR"?"€":"$"} note="Free Cash Flow par action" />
                  <Input label="Dette Nette / Action" value={netDebtPS} onChange={setNetDebtPS} suffix={currency==="EUR"?"€":"$"} note="Négatif = trésorerie nette" />
                </div>
              </Card>

              {/* DCF Params */}
              <Card anim delay="0.15s">
                <div style={{ fontSize:11,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14 }}>Paramètres DCF</div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <Input label="WACC" value={wacc} onChange={setWacc} suffix="%" />
                  <Input label="Croissance Y1-5" value={g1} onChange={setG1} suffix="%" />
                  <Input label="Croissance Y6-10" value={g2} onChange={setG2} suffix="%" />
                  <Input label="Croissance terminale" value={tg} onChange={setTg} suffix="%" />
                </div>
              </Card>

              {/* Dilution & Margin */}
              <Card anim delay="0.2s">
                <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <label style={{ fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5,display:"block" }}>
                      Dilution / Rachat annuel
                    </label>
                    <div style={{ position:"relative" }}>
                      <input type="number" step="0.5" value={dilution} onChange={e => setDilution(e.target.value)}
                        style={{ width:"100%",boxSizing:"border-box",background:C.input,border:`1.5px solid ${C.inputBorder}`,borderRadius:10,color:C.text,fontSize:15,fontFamily:mono,padding:"11px 44px 11px 14px",outline:"none" }} />
                      <span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:C.dim,fontSize:11,fontFamily:mono }}>%/an</span>
                    </div>
                    <div style={{ marginTop:6,fontSize:11,fontFamily:mono,color:parseFloat(dilution)<0?C.green:parseFloat(dilution)>0?C.red:C.dim }}>
                      {parseFloat(dilution)<0?"✦ Buyback — FCF/action augmente":parseFloat(dilution)>0?"⚠ Dilution — FCF/action diminue":"— Neutre"}
                    </div>
                  </div>
                  <div style={{ flex:1, minWidth:200 }}>
                    <label style={{ fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5,display:"block" }}>Marge de sécurité</label>
                    <input type="range" min="0" max="50" step="5" value={margin} onChange={e => setMargin(e.target.value)}
                      style={{ width:"100%",accentColor:C.accent,marginTop:10,cursor:"pointer" }} />
                    <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
                      <span style={{ fontSize:10,color:C.dim }}>0%</span>
                      <span style={{ fontSize:18,fontWeight:700,color:C.accent,fontFamily:mono }}>{margin}%</span>
                      <span style={{ fontSize:10,color:C.dim }}>50%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {error && <div style={{ fontSize:13,color:C.red,marginBottom:12 }}>{error}</div>}

              {/* Buttons */}
              <div style={{ display:"flex", gap:12 }}>
                <button onClick={handleReset}
                  style={{
                    padding:"16px 28px", background:"transparent", border:`1px solid ${C.inputBorder}`,
                    borderRadius:14, color:C.dim, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:ff,
                  }}>← Retour</button>
                <button onClick={handleCalculate}
                  style={{
                    flex:1, padding:"16px", border:"none", borderRadius:14,
                    background:`linear-gradient(135deg,${C.accent},#7c3aed)`,
                    color:"#05030e", fontSize:16, fontWeight:700, cursor:"pointer",
                    fontFamily:ff, letterSpacing:"0.03em",
                    boxShadow:`0 6px 30px ${C.accentGlow}`,
                    transition:"transform 0.15s,box-shadow 0.15s",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; }}
                >
                  <Star size={18} color="#05030e" /> Calculer la Valeur Intrinsèque
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              PAGE: RESULTS
              ═══════════════════════════════════════ */}
          {page === PAGE.RESULTS && results && data && (
            <div style={{ animation:"fadeIn 0.5s ease-out" }}>

              {/* Back + ticker */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <button onClick={() => setPage(PAGE.ANALYSIS)}
                  style={{ background:"transparent",border:`1px solid ${C.inputBorder}`,borderRadius:10,padding:"8px 18px",color:C.dim,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff }}>
                  ← Modifier
                </button>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16,fontWeight:700 }}>{data.name?.substring(0,20)}</span>
                  <Tag>{data.ticker}</Tag>
                </div>
                <button onClick={handleReset}
                  style={{ background:"transparent",border:`1px solid ${C.inputBorder}`,borderRadius:10,padding:"8px 18px",color:C.dim,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:ff }}>
                  Nouveau ↻
                </button>
              </div>

              {/* Verdict */}
              <Card glow anim delay="0s" style={{
                textAlign:"center", padding:"36px 24px",
                background:`linear-gradient(135deg,rgba(179,136,255,0.1),rgba(179,136,255,0.02))`,
                border:`1px solid rgba(179,136,255,0.18)`,
              }}>
                <div style={{ fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:8 }}>Valeur Intrinsèque / Action</div>
                <div style={{ fontSize:52,fontWeight:700,fontFamily:mono,color:C.accent,lineHeight:1 }}>
                  {fmtP(results.fairValue, currency)}
                </div>
                {upside !== null && (
                  <div style={{ fontSize:16,marginTop:12,fontFamily:mono,fontWeight:600,color:upside>0?C.green:C.red }}>
                    {upside>0?"▲":"▼"} {Math.abs(upside).toFixed(1)}% vs prix actuel {fmtP(parseFloat(price),currency)}
                  </div>
                )}
                <div style={{ display:"flex",gap:12,justifyContent:"center",marginTop:24,flexWrap:"wrap" }}>
                  <div style={{ background:C.input,borderRadius:12,padding:"14px 24px",border:`1px solid ${C.inputBorder}` }}>
                    <div style={{ fontSize:9,color:C.dim,textTransform:"uppercase" }}>Avec marge {margin}%</div>
                    <div style={{ fontSize:24,fontWeight:700,fontFamily:mono,color:safeUp>0?C.green:C.red }}>{fmtP(results.safeValue,currency)}</div>
                  </div>
                  <div style={{ background:C.input,borderRadius:12,padding:"14px 24px",border:`1px solid ${C.inputBorder}` }}>
                    <div style={{ fontSize:9,color:C.dim,textTransform:"uppercase" }}>Σ DCF /share</div>
                    <div style={{ fontSize:24,fontWeight:700,fontFamily:mono }}>{fmtP(results.sumDCF,currency)}</div>
                  </div>
                  <div style={{ background:C.input,borderRadius:12,padding:"14px 24px",border:`1px solid ${C.inputBorder}` }}>
                    <div style={{ fontSize:9,color:C.dim,textTransform:"uppercase" }}>Terminal /share</div>
                    <div style={{ fontSize:24,fontWeight:700,fontFamily:mono }}>{fmtP(results.discTV,currency)}</div>
                  </div>
                </div>
              </Card>

              {/* Signal pills */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, animation:"slideUp 0.5s ease-out 0.1s both" }}>
                <Pill label="Signal" value={safeUp>0?"ACHAT":safeUp>-15?"NEUTRE":"SURVALORISÉ"} color={safeUp>0?"green":safeUp>-15?null:"red"} />
                <Pill label="Upside Fair" value={(upside>0?"+":"")+(upside?.toFixed(1)||"—")+"%"} color={upside>0?"green":"red"} />
                <Pill label="Upside Safe" value={(safeUp>0?"+":"")+(safeUp?.toFixed(1)||"—")+"%"} color={safeUp>0?"green":"red"} />
              </div>

              {/* Visual bars */}
              {price && (
                <Card anim delay="0.15s">
                  <div style={{ fontSize:11,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:18 }}>Comparaison Visuelle</div>
                  {[
                    { label:"Prix Actuel", value:parseFloat(price), color:C.mid },
                    { label:`Avec Marge ${margin}%`, value:results.safeValue, color:C.accent },
                    { label:"Fair Value", value:results.fairValue, color:C.green },
                  ].map(bar => {
                    const mx = Math.max(parseFloat(price),results.fairValue,results.safeValue,1)*1.15;
                    const pct = Math.max(0,Math.min(100,(bar.value/mx)*100));
                    return (
                      <div key={bar.label} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                          <span style={{ fontSize:11,color:C.dim }}>{bar.label}</span>
                          <span style={{ fontSize:14,fontFamily:mono,fontWeight:600,color:bar.color }}>{fmtP(bar.value,currency)}</span>
                        </div>
                        <div style={{ height:8,background:C.input,borderRadius:4,overflow:"hidden" }}>
                          <div style={{ width:pct+"%",height:"100%",background:`linear-gradient(90deg,${bar.color},${bar.color}88)`,borderRadius:4,transition:"width 1s cubic-bezier(0.16,1,0.3,1)" }}/>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}

              {/* Projection table */}
              <Card anim delay="0.2s">
                <div onClick={() => setShowTable(!showTable)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",userSelect:"none" }}>
                  <div style={{ fontSize:11,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em" }}>Projections 10 Ans · Per Share</div>
                  <span style={{ fontSize:20,color:C.dim,transition:"transform 0.3s",transform:showTable?"rotate(180deg)":"rotate(0)" }}>▾</span>
                </div>
                {showTable && (
                  <div style={{ marginTop:14,overflowX:"auto" }}>
                    <table style={{ width:"100%",borderCollapse:"collapse",fontFamily:mono,fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                          {["An.","Crois.","FCF/sh","FCF/sh Act.","Cumul Act."].map(h => (
                            <th key={h} style={{ padding:"8px 10px",textAlign:"right",color:C.dim,fontWeight:600,fontSize:9,textTransform:"uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.projections.map((p,i) => {
                          const cum = results.projections.slice(0,i+1).reduce((s,x) => s+x.discounted, 0);
                          return (
                            <tr key={p.year} style={{ borderBottom:`1px solid ${C.border}22` }}>
                              <td style={{ padding:"7px 10px",textAlign:"right",color:C.mid }}>Y{p.year}</td>
                              <td style={{ padding:"7px 10px",textAlign:"right",color:p.gRate>=0?C.green:C.red }}>{(p.gRate*100).toFixed(1)}%</td>
                              <td style={{ padding:"7px 10px",textAlign:"right",color:C.text }}>{fmtN(p.fcfPS)}</td>
                              <td style={{ padding:"7px 10px",textAlign:"right",color:C.accent }}>{fmtN(p.discounted)}</td>
                              <td style={{ padding:"7px 10px",textAlign:"right",color:C.mid }}>{fmtN(cum)}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop:`2px solid ${C.accent}33` }}>
                          <td colSpan={2} style={{ padding:"9px 10px",textAlign:"right",color:C.accent,fontWeight:700,fontSize:11 }}>Terminal /sh</td>
                          <td style={{ padding:"9px 10px",textAlign:"right",color:C.dim }}>{fmtN(results.tv)}</td>
                          <td style={{ padding:"9px 10px",textAlign:"right",color:C.accent,fontWeight:700 }}>{fmtN(results.discTV)}</td>
                          <td style={{ padding:"9px 10px",textAlign:"right",color:C.text,fontWeight:700 }}>{fmtN(results.sumDCF+results.discTV)}</td>
                        </tr>
                        <tr style={{ borderTop:`1px solid ${C.border}` }}>
                          <td colSpan={2} style={{ padding:"9px 10px",textAlign:"right",color:C.red,fontWeight:700,fontSize:11 }}>− Dette Nette /sh</td>
                          <td colSpan={2}/>
                          <td style={{ padding:"9px 10px",textAlign:"right",color:parseFloat(netDebtPS)>0?C.red:C.green,fontWeight:700 }}>
                            {parseFloat(netDebtPS)>0?"−":"+"}{fmtN(Math.abs(parseFloat(netDebtPS)||0))}
                          </td>
                        </tr>
                        <tr style={{ borderTop:`2px solid ${C.green}44` }}>
                          <td colSpan={2} style={{ padding:"10px 10px",textAlign:"right",color:C.green,fontWeight:700,fontSize:13 }}>= FAIR VALUE /sh</td>
                          <td colSpan={2}/>
                          <td style={{ padding:"10px 10px",textAlign:"right",color:C.green,fontWeight:700,fontSize:18 }}>{fmtP(results.fairValue,currency)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign:"center",marginTop:40,fontSize:10,color:C.dim,lineHeight:1.7 }}>
            <Star size={14} color={C.dim} /><br/>
            DCF Valuation · Données live Finnhub.io · Toutes métriques per share<br/>
            Ceci n'est pas un conseil d'investissement.
          </div>
        </div>
      </div>
    </div>
  );
}
