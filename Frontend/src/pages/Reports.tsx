import { useState } from "react";
import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { motion } from "framer-motion";
import { FileText, Download, Check, Sparkles, Filter, Calendar } from "lucide-react";
import { formatINR } from "../lib/format";

interface ReportItem {
  id: string;
  title: string;
  period: string;
  totalLeakageRs: number;
  recoveredRs: number;
  criticalAlerts: number;
  generatedDate: string;
}

const reportsData: ReportItem[] = [
  {
    id: "REP-2026-08",
    title: "Executive Revenue Leakage & Recovery Report",
    period: "August 2026",
    totalLeakageRs: 1840000,
    recoveredRs: 1120000,
    criticalAlerts: 7,
    generatedDate: "2026-08-27",
  },
  {
    id: "REP-2026-07",
    title: "Monthly Process Conformance & Audit Summary",
    period: "July 2026",
    totalLeakageRs: 1420000,
    recoveredRs: 980000,
    criticalAlerts: 5,
    generatedDate: "2026-07-31",
  },
  {
    id: "REP-2026-Q2",
    title: "Quarterly Revenue Process Twin Audit Deck",
    period: "Q2 2026 (Apr - Jun)",
    totalLeakageRs: 4890000,
    recoveredRs: 3410000,
    criticalAlerts: 18,
    generatedDate: "2026-06-30",
  },
];

export default function Reports() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = (id: string, type: "pdf" | "csv") => {
    setDownloadingId(`${id}-${type}`);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`Downloaded ${id}_${type.toUpperCase()} executive summary.`);
    }, 1200);
  };

  return (
    <PageShell>
      <PageHeader
        title="Executive Reports & Audits"
        subtitle="Export high-level board reports, deterministic audit summaries, and CSV data packages."
        actions={
          <button
            onClick={() => handleDownload("REP-LIVE", "pdf")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-white text-xs font-semibold rounded-lg hover:bg-black transition-all shadow-sm"
          >
            <Sparkles size={14} />
            Generate Board Report PDF
          </button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Total Audited Leakage</div>
            <div className="text-2xl font-bold text-[var(--color-ink)] mt-1 font-display">₹81.5L</div>
            <div className="text-[11px] text-gray-500 mt-1">Across 37 ingestion runs</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Total Recovered Capital</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1 font-display">₹55.1L</div>
            <div className="text-[11px] text-emerald-600 mt-1">67.6% recovery rate</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-[var(--color-muted)] font-semibold">Audit Integrity</div>
            <div className="text-2xl font-bold text-[var(--color-ink)] mt-1 font-display">100%</div>
            <div className="text-[11px] text-gray-500 mt-1">Tamper-evident log verified</div>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
            <FileText size={16} className="text-[var(--color-accent)]" />
            Generated Audit & Executive Reports
          </div>

          <div className="grid grid-cols-1 gap-4">
            {reportsData.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5 border border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-300 transition-all shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">{report.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {report.period}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-1 flex items-center gap-4">
                      <span>Leakage: <strong className="text-red-600">{formatINR(report.totalLeakageRs)}</strong></span>
                      <span>Recovered: <strong className="text-emerald-600">{formatINR(report.recoveredRs)}</strong></span>
                      <span>{report.criticalAlerts} Critical Alerts</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleDownload(report.id, "pdf")}
                    disabled={downloadingId === `${report.id}-pdf`}
                    className="px-3.5 py-2 text-xs font-semibold bg-white border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download size={14} />
                    {downloadingId === `${report.id}-pdf` ? "Generating PDF..." : "Export PDF"}
                  </button>

                  <button
                    onClick={() => handleDownload(report.id, "csv")}
                    disabled={downloadingId === `${report.id}-csv`}
                    className="px-3.5 py-2 text-xs font-semibold bg-white border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download size={14} />
                    {downloadingId === `${report.id}-csv` ? "Exporting CSV..." : "Export CSV"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
