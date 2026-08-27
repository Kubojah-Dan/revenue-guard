import { useState } from "react";
import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  Zap,
} from "lucide-react";
import { formatINR } from "../lib/format";

interface RecoveryCase {
  id: string;
  customer: string;
  issue: string;
  leakageRs: number;
  recoverableRs: number;
  confidencePct: number;
  recommendedAction: string;
  status: "ready" | "pending_approval" | "executed";
}

const recoveryCases: RecoveryCase[] = [
  {
    id: "RC-101",
    customer: "Acme Corp",
    issue: "Unapproved 68% discount applied on contract renewal",
    leakageRs: 420000,
    recoverableRs: 380000,
    confidencePct: 92,
    recommendedAction: "Normalize discount to approved 20% tier and issue supplementary invoice",
    status: "ready",
  },
  {
    id: "RC-102",
    customer: "Vertex Ltd",
    issue: "Duplicate payment of ₹1.2L received on INV-1092",
    leakageRs: 120000,
    recoverableRs: 120000,
    confidencePct: 99,
    recommendedAction: "Trigger automated Stripe refund reversal flow & update credit ledger",
    status: "ready",
  },
  {
    id: "RC-103",
    customer: "Neon Retail",
    issue: "Silent churn risk: Usage dropped 71% before renewal",
    leakageRs: 210000,
    recoverableRs: 140000,
    confidencePct: 75,
    recommendedAction: "Dispatch automated Executive Success Outreach & discount match offer",
    status: "pending_approval",
  },
  {
    id: "RC-104",
    customer: "Cyberdyne Systems",
    issue: "Price indexation clause omitted from FY26 agreement",
    leakageRs: 310000,
    recoverableRs: 280000,
    confidencePct: 88,
    recommendedAction: "Apply 6.2% CPI escalation adjustment per section 4.2",
    status: "executed",
  },
];

export default function RecoveryCenter() {
  const [cases, setCases] = useState<RecoveryCase[]>(recoveryCases);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAction = (caseId: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId ? { ...c, status: "executed" as const } : c
      )
    );
    setToastMessage(`Action executed successfully for ${caseId}. Audit log appended.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const totalRecoverable = cases.reduce((acc, curr) => acc + curr.recoverableRs, 0);

  return (
    <PageShell>
      <PageHeader
        title="Recovery Center"
        subtitle="Execute counterfactual recovery workflows directly — single-click reversals, re-invoicing, and escalation."
        actions={
          <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <TrendingUp size={14} className="text-emerald-600" />
            Total Recoverable: {formatINR(totalRecoverable)}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-950 text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              {toastMessage}
            </div>
          </motion.div>
        )}

        {/* Counterfactual Action Cards */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
            <Zap size={16} className="text-[var(--color-accent)]" />
            Actionable Recovery Counterfactuals
          </div>

          <div className="grid grid-cols-1 gap-4">
            {cases.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card p-5 border border-[var(--color-border)] shadow-sm hover:border-gray-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--color-muted)]">{item.id}</span>
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">{item.customer}</h3>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{item.issue}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-[var(--color-muted)] font-semibold">Recoverable Amount</div>
                      <div className="text-base font-bold text-emerald-600 font-display">
                        {formatINR(item.recoverableRs)}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                        item.status === "executed"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "pending_approval"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface-2)] p-3.5 rounded-xl text-xs">
                  <div>
                    <span className="font-semibold text-[var(--color-ink)] block">
                      Recommended Counterfactual Action:
                    </span>
                    <span className="text-[var(--color-muted)]">{item.recommendedAction}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] font-semibold text-gray-500">
                      Confidence: {item.confidencePct}%
                    </span>
                    {item.status !== "executed" ? (
                      <button
                        onClick={() => handleAction(item.id)}
                        className="px-4 py-2 bg-[var(--color-ink)] text-white font-semibold rounded-lg hover:bg-black transition-all shadow-xs flex items-center gap-1.5"
                      >
                        Approve & Execute
                        <ArrowUpRight size={14} />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold px-3 py-1.5 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                        <CheckCircle2 size={14} /> Executed & Audited
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
