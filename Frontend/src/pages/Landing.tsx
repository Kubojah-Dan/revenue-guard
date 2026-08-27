import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  AlertTriangle, RefreshCcw, TrendingDown, Shield, ChevronRight,
  BarChart2, Zap, FileText, ArrowRight, Check, X, Database,
  GitBranch, Search, ArrowDown,
} from "lucide-react";
import { DisplayCards } from "../components/ui/DisplayCards";
import { LeakageByTypeChart } from "../components/charts/LeakageByTypeChart";
import { SeverityDonutChart } from "../components/charts/SeverityDonutChart";
import { EASE } from "../lib/motion";
import { formatINRShort } from "../lib/format";
import { useSummary } from "../hooks/useSummary";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const RV = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const prefersReduced = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext("2d")!;
    let w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w; canvas.height = h;
    type N = { x: number; y: number; vx: number; vy: number; op: number; dop: number };
    const nodes: N[] = Array.from({ length: 18 }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-0.5)*0.14, vy: (Math.random()-0.5)*0.14,
      op: Math.random()*0.4+0.1, dop: (Math.random()-0.5)*0.003,
    }));
    const C = 140, A = "109, 91, 208"; let last = 0;
    function draw(ts: number) {
      if (ts - last < 33) { animRef.current = requestAnimationFrame(draw); return; }
      last = ts; ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.op += n.dop; if (n.op <= 0.05 || n.op >= 0.5) n.dop *= -1;
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i+1; j < nodes.length; j++) {
        const dx = nodes[i].x-nodes[j].x, dy = nodes[i].y-nodes[j].y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < C) {
          ctx.strokeStyle = `rgba(${A},${(1-d/C)*0.18*Math.min(nodes[i].op,nodes[j].op)*3})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y); ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${A},${n.op*0.7})`; ctx.beginPath(); ctx.arc(n.x, n.y, 2, 0, Math.PI*2); ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [prefersReduced]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" style={{ zIndex: 1 }} />;
}

function StatCounter({ value, isRs, label, delay = 0 }: { value: number; isRs?: boolean; label: string; delay?: number }) {
  const [disp, setDisp] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });
  useEffect(() => {
    if (!inView) return;
    const dur = 1400; const steps = 40; const inc = value / steps; let cur = 0;
    const t = setTimeout(() => {
      const timer = setInterval(() => {
        cur = Math.min(cur + inc, value);
        setDisp(Math.round(cur));
        if (cur >= value) clearInterval(timer);
      }, dur / steps);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [inView, value, delay]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-stat text-[var(--color-ink)] tabular-nums">
        {isRs ? formatINRShort(disp) : disp.toLocaleString("en-IN")}
      </div>
      <div className="text-micro mt-1 text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
  return (
    <motion.div
      ref={ref}
      variants={RV}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const handleScroll = () => {
      setScrolled(el.scrollTop > 30);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? "bg-white/85 backdrop-blur-md border-b border-[var(--color-border)] shadow-xs py-3.5" 
        : "bg-transparent py-5"
    }`}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white border border-black/[0.08] shadow-sm flex items-center justify-center p-1">
            <img src="/logo.png" alt="Revenue Process Twin" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-base text-[var(--color-ink)]">
            Revenue Process Twin
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:text-black hover:bg-black/[0.04] rounded-lg transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 text-xs font-semibold bg-[var(--color-ink)] text-white hover:bg-black rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            Get Started
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}

function PipelineSection() {
  const stages = [
    {
      num: "01",
      title: "Data Ingestion",
      sub: "All formats, zero friction",
      desc: "Connect CSVs, XLSX registers, JSON logs, PDF invoices, or live payment webhooks. Auto-detects schema and maps directly to integer paise.",
      icon: <Database size={20} className="text-[var(--color-accent)]" />,
      tag: "Source Agnostic",
      bullets: ["CSV / Excel / JSON / PDF", "Live webhook event streaming", "Automatic schema mapping"]
    },
    {
      num: "02",
      title: "Process Conformance",
      sub: "Graph reconstruction",
      desc: "Rebuilds every transaction into an ordered event graph (Invoice → Discount → Payment → Renewal) to pinpoint exact process breaks.",
      icon: <GitBranch size={20} className="text-emerald-600" />,
      tag: "Deterministic Graph",
      bullets: ["Event-sequence conformance", "State-machine integrity checking", "Heuristic graph leak detection"]
    },
    {
      num: "03",
      title: "Leakage Triage",
      sub: "Counterfactual math",
      desc: "Every alert calculates exact leak amount and recoverable potential with counterfactual simulations: 'If X was done, you recover ₹Y'.",
      icon: <Search size={20} className="text-amber-600" />,
      tag: "Evidence First",
      bullets: ["Causal evidence trail", "Automated recovery playbooks", "Tamper-evident audit ledger"]
    }
  ];

  return (
    <section className="py-24 px-6 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-micro mb-3 text-[var(--color-accent)]">Architecture & Pipeline</div>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-[var(--color-ink)] tracking-tight">
              How the Revenue Process Twin operates
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-3 max-w-lg mx-auto">
              From raw heterogeneous business data to continuous revenue leakage prevention.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {stages.map((st, i) => (
            <Reveal key={st.num} delay={i * 0.15}>
              <div className="h-full p-6 rounded-2xl bg-white border border-[var(--color-border)] shadow-[var(--shadow-elevation-1)] hover:shadow-[var(--shadow-elevation-2)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      {st.icon}
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-400">{st.num}</span>
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 mb-2">
                    {st.tag}
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-ink)] mb-1">{st.title}</h3>
                  <div className="text-xs font-medium text-[var(--color-accent)] mb-3">{st.sub}</div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-6">{st.desc}</p>
                </div>
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  {st.bullets.map((b, bi) => (
                    <div key={bi} className="flex items-center gap-2 text-[11px] text-gray-600">
                      <Check size={12} className="text-emerald-600 flex-shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { data: summaryData } = useSummary();

  const summary = summaryData ?? {
    total_leakage_rs: 227448017.06,
    total_recoverable_rs: 173541812.50,
    active_alerts: 47,
    by_leak_type: [
      { leak_type: "over_discount", leakage_rs: 6300000, recoverable_rs: 4800000, count: 14 },
      { leak_type: "duplicate_payment", leakage_rs: 5100000, recoverable_rs: 5100000, count: 8 },
      { leak_type: "missed_renewal", leakage_rs: 4200000, recoverable_rs: 3200000, count: 12 },
      { leak_type: "invoice_overdue", leakage_rs: 3800000, recoverable_rs: 2800000, count: 9 },
      { leak_type: "silent_churn", leakage_rs: 1900000, recoverable_rs: 1454181, count: 4 },
    ],
    by_severity: [
      { severity: "critical", leakage_rs: 10400000, recoverable_rs: 8900000, count: 18 },
      { severity: "high", leakage_rs: 7200000, recoverable_rs: 5400000, count: 15 },
      { severity: "medium", leakage_rs: 3800000, recoverable_rs: 2200000, count: 10 },
      { severity: "low", leakage_rs: 1344801, recoverable_rs: 854181, count: 4 },
    ]
  };

  const cards = [
    { icon: <AlertTriangle size={18} />, title: "₹4.2L caught", description: "Unapproved 68% discount on Acme Corp flagged before renewal executed", date: "Critical • Over-discount", iconBg: "rgba(192,21,47,0.09)", accentColor: "#c0152f" },
    { icon: <RefreshCcw size={18} />, title: "₹1.2L recovered", description: "Duplicate payment on Vertex Ltd reversed automatically by the process twin", date: "High confidence • Duplicate", iconBg: "rgba(109,91,208,0.09)", accentColor: "var(--color-accent)" },
    { icon: <TrendingDown size={18} />, title: "Churn caught early", description: "3-month revenue decline detected before Neon Retail subscription lapsed", date: "Silent churn • 71% risk score", iconBg: "rgba(184,134,46,0.09)", accentColor: "#b8862e" },
  ];

  const trust = [
    { icon: <Shield size={16} />, title: "Deterministic, not a black box", desc: "Every alert cites the exact process step that broke, the rule violated, and the evidence." },
    { icon: <FileText size={16} />, title: "Every action is audited", desc: "Full tamper-evident log of who executed what, when, and with what outcome." },
    { icon: <Zap size={16} />, title: "Real Data & Instant Sync", desc: "Native connections to SQLite/Postgres and local Ollama streaming engine." },
  ];

  const metrics = [
    { label: "Leakage detected", value: summary.total_leakage_rs, isRs: true, delay: 0 },
    { label: "Recoverable", value: summary.total_recoverable_rs, isRs: true, delay: 0.1 },
    { label: "Active alerts", value: summary.active_alerts, isRs: false, delay: 0.18 },
    { label: "Leak types tracked", value: summary.by_leak_type.length, isRs: false, delay: 0.26 },
  ];

  return (
    <div id="landing-scroll" className="landing-body" style={{ height: "100vh", overflowY: "auto", overflowX: "hidden" }} data-lenis-prevent>
      <LandingNav />

      {/* Hero */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* High-visibility Hero background image (opacity 0.28) */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.jpg"
            alt="Business Services Background"
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.28, filter: "contrast(1.15) brightness(0.95)" }}
          />
          {/* Thinner frost overlay so photo remains crisp */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.45) 0%, rgba(245,245,248,0.65) 65%, #f5f5f8 100%)",
            }}
          />
        </div>

        <HeroCanvas />

        <div className="relative max-w-4xl mx-auto flex flex-col items-center" style={{ zIndex: 2 }}>
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-black/[0.08] shadow-xs text-xs font-semibold text-[var(--color-ink)] mb-6 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Deterministic Revenue Leakage Detection Engine
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[var(--color-ink)] leading-[1.08] max-w-3xl"
          >
            Find the revenue your process is losing.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="text-base sm:text-lg text-[var(--color-muted)] max-w-2xl mt-6 leading-relaxed font-medium"
          >
            Revenue Process Twin continuously mines your billing, payment, and contract events to detect process breaks, calculate recoverable revenue, and trigger instant recovery.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center gap-3.5 mt-8 w-full sm:w-auto"
          >
            <button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[var(--color-ink)] text-white font-semibold text-sm hover:bg-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Start Finding Leaks
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-[var(--color-border)] text-[var(--color-ink)] font-semibold text-sm hover:bg-gray-50 shadow-xs transition-all flex items-center justify-center gap-2"
            >
              Sign In to Dashboard
            </button>
          </motion.div>
        </div>
      </section>

      {/* Metrics Counter Strip */}
      <section className="border-y border-[var(--color-border)] bg-white/70 backdrop-blur-sm py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map((m) => (
            <StatCounter key={m.label} label={m.label} value={m.value} isRs={m.isRs} delay={m.delay} />
          ))}
        </div>
      </section>

      {/* Hero Display Cards */}
      <section className="py-20 px-6 bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-micro mb-2 text-[var(--color-accent)]">Live Process Breaks</div>
              <h2 className="font-display font-bold text-2xl sm:text-4xl text-[var(--color-ink)]">
                Real process deviations caught in production
              </h2>
            </div>
          </Reveal>
          <div className="flex justify-center">
            <DisplayCards cards={cards} />
          </div>
        </div>
      </section>

      <PipelineSection />

      {/* Live Data Preview */}
      <section id="data" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-micro mb-3 text-[var(--color-accent)]">Live Data Preview</div>
              <h2 className="font-display font-bold text-3xl sm:text-5xl text-[var(--color-ink)]">
                Connected directly to the real engine.
              </h2>
              <p className="text-sm text-[var(--color-muted)] mt-3 max-w-sm mx-auto">
                Live analytics generated by the deterministic conformance and recovery engine.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-elevation-2)]">
              <div className="bg-[var(--color-surface-2)] px-4 py-3 flex items-center gap-2 border-b border-[var(--color-border)]">
                <div className="flex gap-1.5">
                  {["#ffbd2e","#ff6058","#27c93f"].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="flex-1 bg-white rounded border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] text-center py-1">
                  revenue-process-twin.local/app
                </div>
              </div>
              <div className="p-5 bg-[var(--color-surface)] grid md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-xs font-semibold text-[var(--color-ink)] mb-3">Leakage by Type</div>
                  <LeakageByTypeChart data={summary.by_leak_type} />
                </div>
                <div className="card p-4">
                  <div className="text-xs font-semibold text-[var(--color-ink)] mb-3">Severity Breakdown</div>
                  <SeverityDonutChart data={summary.by_severity} />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Trust Grid */}
      <section className="py-20 px-6 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {trust.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.1}>
              <div className="p-6 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs h-full">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mb-3">
                  {t.icon}
                </div>
                <div className="font-bold text-sm text-[var(--color-ink)] mb-1">{t.title}</div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured Quote Section */}
      <div className="text-center py-16 px-6 bg-white border-t border-[var(--color-border)]">
        <h2 className="font-display font-bold text-2xl sm:text-4xl text-[var(--color-ink)] max-w-3xl mx-auto leading-snug">
          "Revenue leakage doesn't announce itself. <span className="text-[var(--color-accent)]">Your process should.</span>"
        </h2>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted)]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-[var(--color-ink)]">Revenue Process Twin</span>
            <span>• Continuous Conformance & Recovery Engine</span>
          </div>
          <div>© 2026 Revenue Process Twin. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
