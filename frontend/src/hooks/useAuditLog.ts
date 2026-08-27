import { useState } from "react";
import mockData from "../mocks/mock_api.json";
import type { AuditLogEntry } from "../types/interfaces";

const seedLog: AuditLogEntry[] = (mockData as { audit_log_sample: AuditLogEntry[] }).audit_log_sample;

/** In-session audit log: seed from mock, append live executions. */
export function useAuditLog() {
  const [log, setLog] = useState<AuditLogEntry[]>(seedLog);

  function appendEntry(entry: AuditLogEntry) {
    setLog((prev) => [entry, ...prev]);
  }

  return { log, appendEntry };
}
