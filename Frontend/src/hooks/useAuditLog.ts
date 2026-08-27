import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "../api/apiClient";

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: () => getAuditLog(),
  });
}
