import { useState } from "react";
import type { AuditLogEntry } from "../types/interfaces";

/** In-session audit log: starts empty, append live executions. */
export function useAuditLog() {
  const [log, setLog] = useState<AuditLogEntry[]>([]);

  function appendEntry(entry: AuditLogEntry) {
    setLog((prev) => [entry, ...prev]);
  }

  return { log, appendEntry };
}
