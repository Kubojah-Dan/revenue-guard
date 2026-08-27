import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  AlertTriangle, RefreshCcw, TrendingDown, Shield, ChevronRight,
  BarChart2, Zap, FileText, ArrowRight, Check, X, Database,
  GitBranch, Search, ArrowDown, Building2, ShoppingBag, Radio, Truck, Film
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
  const heroRef = useRef<HTMLDivElement>(null);
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
          ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.strokeStyle = `rgba(${A},${(1-d/C)*0.28})`; ctx.lineWidth = 0.7; ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.beginPath(); ctx.arc(n.x,n.y,1.8,0,Math.PI*2);
        ctx.fillStyle = `rgba(26,26,26,${n.op*0.4})`; ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [prefersReduced]);

  return (
    <div ref={heroRef} className="absolute inset-0 overflow-hidden pointer-events-none z-1">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
}

function AnimNum({ value, prefix = "", suffix = "", delay = 0 }: { value: number; prefix?: string; suffix?: string; delay?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setCount(value); return; }
    const t = setTimeout(() => {
      let start: number | null = null;
      function tick(ts: number) {
        if (!start) start = ts;
        const p = Math.min((ts-start)/900, 1);
        setCount(Math.round(value * (1 - Math.pow(1-p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [inView, value, reduced, delay]);

  const display = value >= 100000
    ? `${prefix}${formatINRShort(count).replace("₹","")}`
    : `${prefix}${count}${suffix}`;
  return <span ref={ref}>{display}</span>;
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"}
      variants={{ hidden: RV.hidden, visible: { ...RV.visible, transition: { ...RV.visible.transition, delay } } }}
      className={className}>
      {children}
    </motion.div>
  );
}

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Product", href: "#product" },
  { label: "Live Data", href: "#data" },
  { label: "Data Ingestion", href: "/data", isRoute: true },
];

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(0);
  const [pill, setPill] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const el = btnRefs.current[active];
    const con = navRef.current;
    if (!el || !con) return;
    const er = el.getBoundingClientRect(), cr = con.getBoundingClientRect();
    setPill({ left: er.left - cr.left, width: er.width });
  }, [active]);

  useEffect(() => {
    const s = document.getElementById("landing-scroll");
    if (!s) return;
    const h = () => setScrolled(s.scrollTop > 60);
    s.addEventListener("scroll", h, { passive: true });
    return () => s.removeEventListener("scroll", h);
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

function InvestigationCard() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const rows = [
    { label: "Account", value: "Acme Corp (CUST-0042)", delay: 0.15 },
    { label: "Violation", value: "Unapproved 68% plan discount", delay: 0.28 },
    { label: "Rule Broken", value: "R03 - Discount Limit Exceeded", delay: 0.4 },
    { label: "Estimated Recovery", value: "₹3,15,000", cls: "text-emerald-600 font-bold", delay: 0.52 },
  ];

  return (
    <div ref={ref} className="card p-5 max-w-sm w-full mx-auto border-[var(--color-border)] shadow-md">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--color-border)]">
        <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={16} className="text-red-600" />
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--color-ink)]">₹4.2L at risk</div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5">Unapproved 68% discount • Acme Corp renewal</div>
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value, cls, delay }) => (
          <motion.div key={label} className="flex items-center justify-between text-[11px]"
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.4, delay: inView ? delay : 0, ease: [0.22,1,0.36,1] }}>
            <span className="text-[var(--color-muted)]">{label}</span>
            <span className={`font-medium text-[var(--color-ink)] ${cls ?? ""}`}>{value}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="mt-4 flex items-center gap-2"
        initial={{ opacity: 0, y: 4 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        transition={{ duration: 0.4, delay: inView ? 0.65 : 0 }}>
        <button className="flex-1 text-[11px] font-semibold py-2 rounded-lg bg-[var(--color-ink)] text-white hover:opacity-90 transition-opacity">Approve Recovery</button>
        <button className="flex-1 text-[11px] font-medium py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">Escalate</button>
      </motion.div>
      <motion.div className="mt-3 pt-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-muted)] flex items-center gap-1.5"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: inView ? 0.8 : 0, duration: 0.4 }}>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Evidence logged • Process step #14 • Invoice INV-2024-883
      </motion.div>
    </div>
  );
}

const STAGES = [
  { label: "Data Sources", color: "var(--color-accent)", items: ["Invoices","Payments","Renewals","Customers"], Icon: Database },
  { label: "Process Twin Engine", color: "#b8862e", items: ["Process Mining","Rules Engine","Anomaly Detection"], Icon: GitBranch },
  { label: "Insights", color: "#c0152f", items: ["Leakage Detected","Evidence Linked","Root Cause"], Icon: Search },
  { label: "Outcomes", color: "#1a7a4a", items: ["Recovery Action","Audit Trail","Closed Loop"], Icon: Check },
];

function PipelineSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.18 });
  return (
    <section id="product" className="py-24 px-6 bg-[var(--color-surface)]">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-16">
          <div className="text-micro mb-3 text-[var(--color-accent)]">How data becomes recovery</div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-[var(--color-ink)]">The Revenue Process Twin Flow</h2>
          <p className="text-sm text-[var(--color-muted)] mt-3 max-w-md mx-auto">
            Every rupee of leakage has a traceable path. We map it, explain it, and give you the tool to recover it.
          </p>
        </Reveal>
        <div ref={ref} className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2">
          {STAGES.map((stage, i) => (
            <div key={stage.label} className="flex flex-col md:flex-row items-stretch flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: i*0.15, ease: [0.22,1,0.36,1] }}
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: stage.color }}>
                    <stage.Icon size={14} />
                  </div>
                  <div className="text-[11px] font-bold text-[var(--color-ink)]">{stage.label}</div>
                </div>
                <div className="space-y-2">
                  {stage.items.map((item, j) => (
                    <motion.div key={item} className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]"
                      initial={{ opacity: 0, x: -6 }}
                      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                      transition={{ duration: 0.35, delay: i*0.15+j*0.07+0.2 }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                      {item}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              {i < STAGES.length-1 && (
                <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: i*0.15+0.35 }}
                  className="flex items-center justify-center px-3 py-2 md:py-0 text-[var(--color-border)]">
                  <ArrowRight size={14} className="hidden md:block" />
                  <ArrowDown size={14} className="block md:hidden" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const DIFFS = [
  { aspect: "Approach", old: "Detect suspicious transactions", neu: "Detect process violations against defined rules" },
  { aspect: "Explanation", old: "Score-based • limited reasoning", neu: "Cites exact process step, rule broken, and evidence" },
  { aspect: "Timing", old: "Mostly retrospective", neu: "Catches leaks before they finalize" },
  { aspect: "Recovery", old: "Analytics report", neu: "One-click recovery action + workflow" },
  { aspect: "Audit", old: "Limited trail", neu: "Full tamper-evident log of every action and outcome" },
];

function DiffSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <Reveal className="text-center mb-14">
          <div className="text-micro mb-3 text-[var(--color-accent)]">Why Revenue Process Twin?</div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-[var(--color-ink)]">Detection is table stakes.<br />We explain and recover.</h2>
          <p className="text-sm text-[var(--color-muted)] mt-3 max-w-sm mx-auto">
            Traditional tools tell you something is wrong. We tell you why, what it cost, and exactly how to fix it.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <div className="px-5 py-3" />
              <div className="px-5 py-3 text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider border-l border-[var(--color-border)]">Traditional Tools</div>
              <div className="px-5 py-3 border-l border-[var(--color-border)] flex items-center gap-1.5">
                <img src="/logo.png" alt="" className="w-4 h-4 object-contain" />
                <span className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider">Revenue Process Twin</span>
              </div>
            </div>
            {DIFFS.map((row, i) => (
              <Reveal key={row.aspect} delay={i*0.05}>
                <div className={`grid grid-cols-3 ${i < DIFFS.length-1 ? "border-b border-[var(--color-border)]" : ""}`}>
                  <div className="px-5 py-4 text-[12px] font-semibold text-[var(--color-ink)]">{row.aspect}</div>
                  <div className="px-5 py-4 text-[12px] text-gray-500 border-l border-[var(--color-border)] flex items-center gap-2">
                    <X size={14} className="text-red-500 flex-shrink-0" />
                    <span>{row.old}</span>
                  </div>
                  <div className="px-5 py-4 text-[12px] font-medium text-emerald-900 bg-emerald-50/40 border-l border-[var(--color-border)] flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>{row.neu}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const USE_CASES = [
  { icon: Building2, title: "SaaS & Enterprise B2B", desc: "Catch contractless discounts, unapproved renewal tiers, and usage drift." },
  { icon: ShoppingBag, title: "E-Commerce & Retail", desc: "Detect spurious refunds, payment gateway fee discrepancies, and promo abuse." },
  { icon: Radio, title: "Telecom & Subscriptions", desc: "Flag silent churn indicators, unbilled overages, and plan downgrade leaks." },
  { icon: Truck, title: "Logistics & Supply Chain", desc: "Reconcile freight invoices against SLA penalty terms and rate cards." },
  { icon: Film, title: "Media & Streaming", desc: "Identify multi-tenant credential leaks and uncollected royalty settlements." },
];

function UseCasesSection() {
  return (
    <section className="py-24 px-6 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <div className="text-micro mb-3 text-[var(--color-accent)]">Target Verticals</div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-[var(--color-ink)]">Built for high-complexity billing</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
          {USE_CASES.map((uc, i) => (
            <Reveal key={uc.title} delay={i*0.08}>
              <div className="p-6 rounded-xl bg-white border border-[var(--color-border)] shadow-xs hover:-translate-y-1 hover:shadow-md transition-all h-full">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mb-3">
                  <uc.icon size={18} />
                </div>
                <h3 className="font-bold text-sm text-[var(--color-ink)] mb-1">{uc.title}</h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">{uc.desc}</p>
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
            Find the revenue your process is{" "}
            <motion.em
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.52 }}
              className="not-italic text-[var(--color-accent)] font-bold"
            >
              losing.
            </motion.em>
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

      {/* Hero Display Cards & Investigation Card */}
      <section id="how" className="py-20 px-6 bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto space-y-12">
          <Reveal>
            <div className="text-center">
              <div className="text-micro mb-2 text-[var(--color-accent)]">Live Process Breaks</div>
              <h2 className="font-display font-bold text-2xl sm:text-4xl text-[var(--color-ink)]">
                Real process deviations caught in production
              </h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <DisplayCards cards={cards} />
            <InvestigationCard />
          </div>
        </div>
      </section>

      <PipelineSection />

      <DiffSection />

      <UseCasesSection />

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

      {/* Dark Final CTA Section */}
      <section className="py-24 px-6 bg-[var(--color-black)] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <h2 className="font-display font-bold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight">
            Revenue leakage doesn't announce itself.<br />
            <span className="text-[var(--color-accent-300)]">Your process should.</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Continuous process mining, causal evidence trails, and one-click recovery for enterprise billing operations.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate("/signup")}
              className="px-8 py-4 rounded-xl bg-white text-[var(--color-black)] font-bold text-sm hover:bg-gray-100 transition-all shadow-lg"
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-4 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Dark Footer */}
      <footer className="border-t border-white/10 bg-[var(--color-black)] py-12 px-6 text-white/40 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-white/80">Revenue Process Twin</span>
            <span>• Continuous Conformance & Recovery Engine</span>
          </div>
          <div>© 2026 Revenue Process Twin. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
