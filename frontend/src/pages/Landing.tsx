import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  AlertTriangle,
  RefreshCcw,
  TrendingDown,
  Shield,
  ChevronRight,
  BarChart2,
  Zap,
  FileText,
} from "lucide-react";
import { DisplayCards } from "../components/ui/DisplayCards";
import { LeakageByTypeChart } from "../components/charts/LeakageByTypeChart";
import { SeverityDonutChart } from "../components/charts/SeverityDonutChart";
import { getScrollReveal, EASE, DURATION, staggerContainer, getFadeUp } from "../lib/motion";
import { formatINRShort } from "../lib/format";
import summaryData from "../mocks/mock_api.json";

// ── Hero background canvas animation ─────────────────────────
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d")!;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Nodes
    const NODE_COUNT = 18;
    type Node = { x: number; y: number; vx: number; vy: number };
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));

    const CONNECT_DIST = 140;
    const ACCENT = "109, 91, 208"; // violet rgb

    let lastFrame = 0;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    function draw(timestamp: number) {
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;

      ctx.clearRect(0, 0, width, height);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.35;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${ACCENT}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26, 26, 26, 0.15)`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    // Pause when hero scrolls out
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animRef.current = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(animRef.current);
        }
      },
      { threshold: 0 }
    );
    if (heroRef.current) observer.observe(heroRef.current);

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={heroRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
}

// ── Animated count-up numeral ─────────────────────────────────
function AnimatedNumber({ value, prefix = "₹", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(value);
      return;
    }
    let start: number | null = null;
    const duration = 700;
    function tick(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  const display = value >= 100000
    ? `${prefix}${formatINRShort(count).replace("₹", "")}`
    : `${prefix}${count}${suffix}`;

  return <span ref={ref}>{display}</span>;
}

// ── Scroll-reveal section wrapper ─────────────────────────────
function RevealSection({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const reveal = getScrollReveal();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ ...reveal, visible: { ...reveal.visible, transition: { ...((reveal.visible as { transition?: object }).transition || {}), delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Sticky nav ────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between px-8 py-4 transition-all duration-200 ${
        scrolled ? "bg-white/85 backdrop-blur-md border-b border-[var(--color-border)]" : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[var(--color-black)] flex items-center justify-center">
          <span className="text-white text-xs font-bold">RG</span>
        </div>
        <span className="font-display font-bold text-sm text-[var(--color-ink)]">Revenue Guard</span>
      </div>
      <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
        <a href="#how" className="hover:text-[var(--color-ink)] transition-colors">How it works</a>
        <a href="#product" className="hover:text-[var(--color-ink)] transition-colors">Product</a>
        <a href="#data" className="hover:text-[var(--color-ink)] transition-colors">Live Data</a>
        <button
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-ink)] transition-colors"
          onClick={() => navigate("/data")}
        >
          Data Ingestion
        </button>
      </nav>
      <motion.button
        className="btn-primary text-sm"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/app")}
      >
        Open Dashboard
        <ChevronRight size={13} />
      </motion.button>
    </header>
  );
}

// ── Main Landing Page ─────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const summary = (summaryData as Record<string, unknown>)["GET /api/recoverable-summary"] as {
    total_leakage_rs: number;
    total_recoverable_rs: number;
    active_alerts: number;
    by_leak_type: Array<{ leak_type: string; leakage_rs: number; recoverable_rs: number; count: number }>;
    by_severity: Array<{ severity: string; leakage_rs: number; recoverable_rs: number; count: number }>;
  };

  const displayCardData = [
    {
      icon: <AlertTriangle size={16} />,
      title: "₹4.2L caught",
      description: "Unapproved 68% discount on Acme Corp flagged before renewal",
      date: "Critical · Over-discount",
    },
    {
      icon: <RefreshCcw size={16} />,
      title: "₹1.2L recovered",
      description: "Duplicate payment on Vertex Ltd reversed automatically",
      date: "High confidence · Duplicate",
    },
    {
      icon: <TrendingDown size={16} />,
      title: "Churn flagged early",
      description: "3-month revenue decline caught before Neon Retail lapsed",
      date: "Silent churn · 71% risk",
    },
  ];

  const steps = [
    {
      icon: <Zap size={18} />,
      title: "Detect",
      desc: "Process mining and graph heuristics scan every invoice, payment and renewal event for conformance breaks.",
    },
    {
      icon: <BarChart2 size={18} />,
      title: "Explain",
      desc: "Every alert comes with a counterfactual: 'If X had happened instead, here's what you'd have recovered.'",
    },
    {
      icon: <Shield size={18} />,
      title: "Recover",
      desc: "One-click approve actions execute recovery workflows directly — reversal, re-invoice, outreach, or escalation.",
    },
    {
      icon: <FileText size={18} />,
      title: "Audit",
      desc: "Every action is logged with actor, timestamp, and outcome — full deterministic audit trail.",
    },
  ];

  const trust = [
    { icon: <Shield size={16} />, title: "Deterministic, not a black box", desc: "Every alert cites the exact process step that broke, the rule violated, and the evidence." },
    { icon: <FileText size={16} />, title: "Every action is audited", desc: "Full tamper-evident log of who executed what, when, and with what outcome." },
    { icon: <Zap size={16} />, title: "Mock-first, drop-in ready", desc: "Built against a frozen API contract. Swap one env var to point at a real backend." },
  ];

  return (
    <div
      id="landing-scroll"
      className="landing-body"
      style={{ height: "100vh", overflowY: "auto", overflowX: "hidden" }}
      data-lenis-prevent
    >
      {/* Sticky nav */}
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative min-h-[88vh] flex flex-col items-center justify-center text-center px-6 py-20"
        style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}
      >
        <HeroCanvas />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white/70 backdrop-blur-sm text-[var(--color-muted)] mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            AI-powered revenue leakage detection
          </motion.div>

          <motion.h1
            className="text-display text-[var(--color-ink)] mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            Find the revenue leaking out of your business
            <em className="not-italic text-[var(--color-accent)]"> before</em> your books do.
          </motion.h1>

          <motion.p
            className="text-base text-[var(--color-text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
          >
            Revenue Guard monitors every invoice, payment, and renewal for process breaks —
            then tells you exactly how to recover it, not just that something went wrong.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
          >
            <motion.button
              className="btn-primary px-6 py-3 text-sm"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/app")}
            >
              Open Dashboard
              <ChevronRight size={14} />
            </motion.button>
            <motion.button
              className="btn-ghost px-6 py-3 text-sm"
              whileTap={{ scale: 0.98 }}
              onClick={() => document.getElementById("data")?.scrollIntoView({ behavior: "smooth" })}
            >
              See it on real data
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── Proof strip ───────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)] bg-white py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Leakage detected", value: summary.total_leakage_rs, isRs: true },
            { label: "Recoverable", value: summary.total_recoverable_rs, isRs: true },
            { label: "Active alerts", value: summary.active_alerts, isRs: false, suffix: "" },
            { label: "Leak types tracked", value: summary.by_leak_type.length, isRs: false, suffix: "" },
          ].map(({ label, value, isRs, suffix }) => (
            <RevealSection key={label} delay={0.05}>
              <div className="font-display text-3xl font-bold text-[var(--color-ink)] tabular">
                <AnimatedNumber
                  value={value}
                  prefix={isRs ? "₹" : ""}
                  suffix={suffix ?? ""}
                />
              </div>
              <div className="text-xs text-[var(--color-muted)] mt-1 font-medium">{label}</div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how" className="py-20 px-6 bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <div className="text-micro mb-3">How it works</div>
              <h2 className="text-h1 text-[var(--color-ink)]">Detect. Explain. Recover. Audit.</h2>
              <p className="text-sm text-[var(--color-muted)] mt-3 max-w-sm mx-auto">
                The full revenue-protection loop, in one dashboard.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Steps */}
            <div className="flex flex-col gap-5">
              {steps.map((step, i) => (
                <RevealSection key={step.title} delay={i * 0.07}>
                  <div className="card p-5 flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <div className="text-h3 text-[var(--color-ink)] mb-1">{step.title}</div>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>

            {/* DisplayCards */}
            <RevealSection delay={0.15} className="flex items-center justify-center py-8">
              <DisplayCards cards={displayCardData} />
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── Live data preview ─────────────────────────────────── */}
      <section id="data" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-12">
              <div className="text-micro mb-3">Live data preview</div>
              <h2 className="text-h1 text-[var(--color-ink)]">This is the real product.</h2>
              <p className="text-sm text-[var(--color-muted)] mt-3 max-w-sm mx-auto">
                Real charts, real mock data. Not a screenshot.
              </p>
            </div>
          </RevealSection>

          {/* Browser-chrome frame */}
          <RevealSection delay={0.1}>
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-elevation-2)]">
              {/* Chrome bar */}
              <div className="bg-[var(--color-surface-2)] px-4 py-3 flex items-center gap-2 border-b border-[var(--color-border)]">
                <div className="flex gap-1.5">
                  {["#ffbd2e","#ff6058","#27c93f"].map((c) => (
                    <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="flex-1 bg-white rounded border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] text-center py-1">
                  revenue-guard.demo/app
                </div>
              </div>

              <div className="p-5 bg-[var(--color-surface)] grid md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-xs font-semibold text-[var(--color-ink)] mb-3">Leakage by Type</div>
                  <LeakageByTypeChart data={summary.by_leak_type} />
                </div>
                <div className="card p-4">
                  <div className="text-xs font-semibold text-[var(--color-ink)] mb-3">Leakage by Severity</div>
                  <SeverityDonutChart data={summary.by_severity as Array<{ severity: "critical" | "high" | "medium" | "low"; leakage_rs: number; recoverable_rs: number; count: number }>} />
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Trust row ─────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {trust.map((t, i) => (
              <RevealSection key={t.title} delay={i * 0.08}>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] flex-shrink-0">
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-ink)] mb-1">{t.title}</div>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "var(--color-black)" }}>
        <RevealSection>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl text-white mb-4 font-normal leading-tight">
              Your revenue leaks are{" "}
              <em className="text-[var(--color-accent-300)]">already happening</em>.
              <br />Start recovering them today.
            </h2>
            <p className="text-sm text-white/50 mb-8">
              Open the live dashboard — no login, no setup, no waiting.
            </p>
            <motion.button
              className="inline-flex items-center gap-2 bg-white text-[var(--color-black)] font-semibold text-sm px-8 py-3.5 rounded-md hover:bg-[var(--color-surface)] transition-colors"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/app")}
            >
              Open Dashboard
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </RevealSection>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] py-8 px-8 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--color-black)] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">RG</span>
          </div>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Revenue Guard</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-[var(--color-muted)]">
          <a href="mailto:demo@revenueguard.demo" className="hover:text-[var(--color-ink)] transition-colors">Contact</a>
          <span>Process Twin Demo</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
