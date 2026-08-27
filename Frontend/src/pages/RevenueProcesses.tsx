import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { motion } from "framer-motion";
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Activity,
  Clock,
} from "lucide-react";
import { formatINR } from "../lib/format";

interface ProcessHealthItem {
  id: string;
  name: string;
  category: string;
  healthScore: number;
  totalVolumeRs: number;
  exposedLeakageRs: number;
  violationsCount: number;
  expectedFlow: string;
  actualFlow: string;
  status: "healthy" | "warning" | "critical";
}

const processesData: ProcessHealthItem[] = [
  {
    id: "PROC-01",
    name: "Discount Approval Conformance",
    category: "Pricing & Contracts",
    healthScore: 61,
    totalVolumeRs: 12500000,
    exposedLeakageRs: 420000,
    violationsCount: 14,
    expectedFlow: "Applied → Approved → Invoice Issued",
    actualFlow: "Applied → Invoice Issued (Approval Bypassed)",
    status: "critical",
  },
  {
    id: "PROC-02",
    name: "Invoice to Payment Settlement",
    category: "Billing & Collections",
    healthScore: 92,
    totalVolumeRs: 48000000,
    exposedLeakageRs: 120000,
    violationsCount: 3,
    expectedFlow: "Invoice Issued → Payment Received → Settled",
    actualFlow: "Invoice Issued → Duplicate Payment Received → Unadjusted",
    status: "healthy",
  },
  {
    id: "PROC-03",
    name: "Contract Renewal Conformance",
    category: "Subscriptions",
    healthScore: 71,
    totalVolumeRs: 18900000,
    exposedLeakageRs: 380000,
    violationsCount: 8,
    expectedFlow: "30-Day Notice → Price Indexing → Executed Renewal",
    actualFlow: "Expired → Lapsed without Notice → Silent Churn Risk",
    status: "warning",
  },
  {
    id: "PROC-04",
    name: "Refund & Credit Note Authorization",
    category: "Adjustments",
    healthScore: 96,
    totalVolumeRs: 3400000,
    exposedLeakageRs: 25000,
    violationsCount: 1,
    expectedFlow: "Ticket Filed → Supervisor Review → Credit Memo",
    actualFlow: "Ticket Filed → Supervisor Review → Credit Memo",
    status: "healthy",
  },
];

export default function RevenueProcesses() {
  return (
    <PageShell>
      <PageHeader
        title="Revenue Process Health"
        subtitle="Monitor end-to-end process conformance across billing, discount approvals, and renewal lifecycles."
        actions={
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] bg-white px-3 py-1.5 rounded-lg border border-[var(--color-border)] shadow-2xs">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            4 Active Process Engines Monitored
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Average Process Integrity</div>
            <div className="text-2xl font-bold text-[var(--color-ink)] mt-1 font-display">80%</div>
            <div className="text-[11px] text-amber-600 mt-1">2 processes need attention</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Total Process Violations</div>
            <div className="text-2xl font-bold text-[var(--color-ink)] mt-1 font-display">26</div>
            <div className="text-[11px] text-gray-500 mt-1">Across 24,751 transactions</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Exposed Revenue at Risk</div>
            <div className="text-2xl font-bold text-red-600 mt-1 font-display">₹9.45L</div>
            <div className="text-[11px] text-red-600 mt-1">Process break financial impact</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Conformance Engine</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1 font-display">Deterministic</div>
            <div className="text-[11px] text-gray-500 mt-1">Graph & heuristic verification</div>
          </div>
        </div>

        {/* Process Cards */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
            <GitBranch size={16} className="text-[var(--color-accent)]" />
            Monitored Revenue Processes
          </div>

          <div className="grid grid-cols-1 gap-4">
            {processesData.map((proc, i) => (
              <motion.div
                key={proc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card p-5 border border-[var(--color-border)] hover:border-gray-300 transition-all shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        proc.status === "critical"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : proc.status === "warning"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {proc.healthScore}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--color-ink)]">{proc.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 font-semibold text-gray-600">
                          {proc.category}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-muted)] mt-0.5">
                        Volume: {formatINR(proc.totalVolumeRs)} · {proc.violationsCount} violations detected
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-[var(--color-muted)] font-semibold">Leakage Risk</div>
                      <div className="text-sm font-bold text-red-600">
                        {formatINR(proc.exposedLeakageRs)}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                        proc.status === "critical"
                          ? "bg-red-100 text-red-800"
                          : proc.status === "warning"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {proc.status}
                    </span>
                  </div>
                </div>

                {/* Flow comparison */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <div className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Expected Conformance Path
                    </div>
                    <div className="text-emerald-800 font-mono text-[11px]">{proc.expectedFlow}</div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      proc.status === "healthy"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                        : "bg-red-50/50 border-red-100 text-red-900"
                    }`}
                  >
                    <div className="font-semibold mb-1 flex items-center gap-1.5">
                      {proc.status === "healthy" ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={14} className="text-red-600" />
                      )}
                      Observed Actual Process Twin Flow
                    </div>
                    <div className="font-mono text-[11px]">{proc.actualFlow}</div>
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
