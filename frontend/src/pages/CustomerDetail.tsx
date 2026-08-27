import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { MoneyValue } from "../components/shared/MoneyValue";
import { PageLoader, ErrorState } from "../components/shared/LoadingSpinner";
import { RiskGaugeChart } from "../components/charts/RiskGaugeChart";
import { ContributingFactorsChart } from "../components/charts/ContributingFactorsChart";
import { NetworkGraphChart } from "../components/charts/NetworkGraphChart";
import { useCustomerRisk } from "../hooks/useCustomerRisk";
import { useCustomerExplain } from "../hooks/useCustomerExplain";
import { postExecuteAction } from "../api/apiClient";
import { formatPct, formatINR } from "../lib/format";
import { getFadeUp, staggerContainer } from "../lib/motion";
import type { AuditLogEntry } from "../types/interfaces";

interface ToastState { show: boolean; message: string; type: "success" | "error" }
interface Props { onAuditAppend?: (entry: AuditLogEntry) => void }

/** Process Break Timeline — interactive with hover evidence tooltips */
function ProcessTimeline({
  deviations,
  highlightIndex,
}: {
  deviations: Array<{
    rule_id: string;
    process_break_step: string | null;
    expected_next: string | null;
    actual_next: string | null;
    deviation_type: string;
    evidence: string;
  }>;
  highlightIndex: number | null;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {deviations.map((d, i) => {
        const isHighlighted = highlightIndex === i;
        const isHovered = hovered === i;

        return (
          <motion.div
            key={i}
            animate={{
              opacity: highlightIndex !== null && !isHighlighted ? 0.45 : 1,
              scale: isHighlighted ? 1.01 : 1,
            }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {/* Break-point node */}
            <div className="flex items-center gap-3">
              <motion.div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 cursor-pointer"
                animate={{ background: isHighlighted ? "#0a0a0a" : "#f5f5f5" }}
                transition={{ duration: 0.2 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <span style={{ fontSize: 11 }}>{isHighlighted ? "⚡" : "○"}</span>
              </motion.div>
              <code className="text-xs font-mono bg-[var(--color-surface-2)] px-2 py-1 rounded border border-[var(--color-border)]">
                {d.process_break_step ?? "—"}
              </code>
              <span className="text-xs text-[var(--color-muted)]">break point</span>
            </div>

            {/* Expected vs Actual tracks */}
            <div className="ml-10 grid grid-cols-2 gap-3">
              {/* Expected path — dashed border */}
              <div className="border border-dashed border-[var(--color-border-strong)] rounded-md p-3 bg-[var(--color-surface-2)]">
                <div className="text-micro mb-1.5">Expected next</div>
                {d.expected_next ? (
                  <code className="text-xs font-mono text-[var(--color-muted)]">{d.expected_next}</code>
                ) : (
                  <span className="text-xs text-[var(--color-muted)] italic">— end of flow —</span>
                )}
              </div>
              {/* Actual path — solid, highlighted */}
              <div className="border border-[var(--color-ink)] rounded-md p-3 bg-[var(--color-surface)]">
                <div className="text-micro mb-1.5">Actual next</div>
                <code className="text-xs font-mono text-[var(--color-ink)] font-semibold">
                  {d.actual_next ?? "—"}
                </code>
              </div>
            </div>

            {/* Evidence — visible on highlight OR hover */}
            <AnimatePresence>
              {(isHighlighted || isHovered) && (
                <motion.div
                  className="ml-10 flex gap-2 items-start bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-md p-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-[var(--color-muted)]" />
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{d.evidence}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Deviation + rule tags */}
            <div className="ml-10">
              <code className="text-[10px] font-mono bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded">
                {d.deviation_type} · {d.rule_id}
              </code>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Radial confidence gauge reusing RiskGaugeChart at small size */
function ConfidenceGauge({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center">
      <div style={{ width: 80, height: 80 }}>
        <RiskGaugeChart value={Math.round(value * 100)} size="mini" />
      </div>
      <div className="text-[10px] text-[var(--color-muted)] -mt-1">Confidence</div>
    </div>
  );
}

export default function CustomerDetail({ onAuditAppend }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fadeUp = getFadeUp();

  const { data: risk, isLoading: rLoading, error: rError } = useCustomerRisk(id!);
  const { data: explain, isLoading: eLoading, error: eError } = useCustomerExplain(id!);

  // Linked highlight state: factor bar ↔ timeline entry
  const [highlightedFactor, setHighlightedFactor] = useState<number | null>(null);

  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "success" });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  }, []);

  async function handleApproveAction() {
    if (!explain?.counterfactual || !id) return;
    setApproving(true);
    try {
      const result = await postExecuteAction({
        alert_id: `ALT-${id}`,
        action: explain.counterfactual.statement,
        actor: "user",
      });
      if (result.status === "success") {
        setApproved(true);
        showToast("Action approved and executed successfully.");
        onAuditAppend?.({
          log_id: result.audit_log_id,
          alert_id: `ALT-${id}`,
          action_type: explain.counterfactual.cf_id,
          actor: "user",
          outcome: "success",
          executed_at: result.executed_at,
        });
        const params = new URLSearchParams({
          alert_id: `ALT-${id}`,
          action: explain.counterfactual.cf_id,
          customer: risk?.customer_name ?? id,
          recovery: String(explain.counterfactual.estimated_recovery_rs),
        });
        window.open(`/mock-billing/index.html?${params.toString()}`, "_blank");
      }
    } catch {
      showToast("Failed to execute action.", "error");
    } finally {
      setApproving(false);
    }
  }

  const isLoading = rLoading || eLoading;
  const hasError = rError || eError;

  return (
    <PageShell title={risk?.customer_name ? `Customer 360 — ${risk.customer_name}` : "Customer 360"}>
      <button className="btn-ghost mb-5 flex items-center gap-2 text-xs" onClick={() => navigate("/alerts")}>
        <ArrowLeft size={13} /> Back to Alerts
      </button>

      {isLoading && <PageLoader />}
      {!isLoading && hasError && (
        <ErrorState message="Customer not found. Available: CUST-0042, CUST-0108, CUST-0077, CUST-0031, CUST-1020, CUST-1021, CUST-1022, CUST-1023, CUST-1024, CUST-1025, CUST-1026, CUST-1010" />
      )}

      {!isLoading && risk && explain && (
        <motion.div
          className="flex flex-col gap-5"
          variants={staggerContainer(0.07)}
          initial="initial"
          animate="animate"
        >
          {/* Risk header row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gauge */}
            <motion.div variants={fadeUp} className="card p-5 flex flex-col items-center">
              <div className="text-micro mb-2 self-start">Risk Score</div>
              <RiskGaugeChart value={risk.risk_score} label="Risk" />
              <div className="mt-1 text-xs text-[var(--color-muted)] text-center">
                {risk.risk_score >= 70 ? "High risk — immediate action recommended" :
                 risk.risk_score >= 40 ? "Medium risk — monitor closely" :
                 "Low risk — routine review"}
              </div>
            </motion.div>

            {/* Churn + Conformance */}
            <motion.div variants={fadeUp} className="card p-5 flex flex-col gap-4">
              <div className="text-micro">Risk Indicators</div>
              {[
                { label: "Churn Probability", value: risk.churn_probability, color: "var(--color-ink)" },
                { label: "Conformance Deviation", value: risk.conformance_deviation_score, color: "var(--color-accent)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="border border-[var(--color-border)] rounded-md p-3">
                  <div className="text-micro mb-1">{label}</div>
                  <div className="text-xl font-bold tabular font-display" style={{ color }}>
                    {formatPct(value)}
                  </div>
                  <div className="mt-2 h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${value * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Contributing factors — clickable */}
            <motion.div variants={fadeUp} className="card p-5">
              <div className="text-micro mb-1">Contributing Factors</div>
              <p className="text-[10px] text-[var(--color-muted)] mb-3">
                Click a factor to highlight the related process break below.
              </p>
              <ContributingFactorsChart
                data={risk.contributing_factors}
                highlightIndex={highlightedFactor ?? undefined}
                onFactorClick={(i) => setHighlightedFactor(prev => prev === i ? null : i)}
              />
            </motion.div>
          </div>

          {/* Process Break Timeline */}
          <motion.div variants={fadeUp} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-h3 text-[var(--color-ink)]">Process Break Timeline</h2>
              {highlightedFactor !== null && (
                <button
                  className="btn-ghost text-[10px] py-0.5 px-2"
                  onClick={() => setHighlightedFactor(null)}
                >
                  Clear highlight
                </button>
              )}
            </div>
            <ProcessTimeline
              deviations={explain.conformance_deviations}
              highlightIndex={highlightedFactor}
            />
          </motion.div>

          {/* Graph network */}
          <motion.div variants={fadeUp} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-h3 text-[var(--color-ink)]">Graph Alert Network</h2>
              <code className="text-[10px] font-mono bg-[var(--color-accent-light)] text-[var(--color-accent)] px-1.5 py-0.5 rounded">
                {explain.graph_links.heuristic}
              </code>
              <span className="text-[10px] text-[var(--color-muted)]">Drag nodes to explore</span>
            </div>
            <NetworkGraphChart
              heuristic={explain.graph_links.heuristic}
              entities={explain.graph_links.connected_entities}
              customerId={risk.customer_id}
            />
          </motion.div>

          {/* Counterfactual panel */}
          <motion.div variants={fadeUp} className="card p-5 border-l-4 border-l-[var(--color-black)]">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-micro">Counterfactual Analysis</div>
                  <code className="text-[10px] font-mono bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                    {explain.counterfactual.cf_id}
                  </code>
                </div>
                <p className="text-sm text-[var(--color-text)] mb-5 leading-relaxed">
                  {explain.counterfactual.statement}
                </p>

                <div className="flex flex-wrap gap-6 mb-4 items-start">
                  <div>
                    <div className="text-micro mb-1">Est. Recovery</div>
                    <div className="text-2xl font-bold money-accent tabular font-display">
                      {formatINR(explain.counterfactual.estimated_recovery_rs)}
                    </div>
                  </div>
                  {/* Radial confidence gauge */}
                  <ConfidenceGauge value={explain.counterfactual.confidence} />
                </div>

                {/* Rule traces */}
                <div className="flex gap-2 flex-wrap">
                  {explain.rule_traces.map(r => (
                    <code key={r} className="text-[10px] font-mono bg-[var(--color-surface-2)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
                      {r}
                    </code>
                  ))}
                </div>
              </div>

              {/* Approve button */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <motion.button
                  id="approve-action-btn"
                  className="btn-primary"
                  onClick={handleApproveAction}
                  disabled={approving || approved}
                  whileTap={{ scale: 0.97 }}
                  animate={approved ? { background: "#1a7a4a" } : {}}
                  transition={{ duration: 0.15 }}
                >
                  {approving ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Executing…</>
                  ) : approved ? (
                    <><CheckCircle size={14} /> Executed</>
                  ) : (
                    <><CheckCircle size={14} /> Approve Action</>
                  )}
                </motion.button>
                <div className="text-[10px] text-[var(--color-muted)] text-center">
                  Opens billing portal <ExternalLink size={9} className="inline" />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{ background: toast.type === "error" ? "#c0152f" : "#0a0a0a" }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
