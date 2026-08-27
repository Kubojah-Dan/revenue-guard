/**
 * apiClient.ts — Typed fetch wrappers for all 7 Revenue Guard API routes.
 * Set VITE_API_BASE_URL to point at a real FastAPI backend; leave empty for MSW mock.
 */
import type {
  AlertsResponse,
  CustomerRisk,
  CustomerExplain,
  RecoverableSummary,
  ChatRequest,
  ChatResponse,
  ActionExecuteRequest,
  ActionExecuteResponse,
  HealthResponse,
} from "../types/interfaces";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

/* ── Read endpoints ─────────────────────────────────────── */

export const getAlerts = (params?: {
  page?: number;
  page_size?: number;
  severity?: string;
  status?: string;
  customer_id?: string;
}): Promise<AlertsResponse> => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.status) qs.set("status", params.status);
  if (params?.customer_id) qs.set("customer_id", params.customer_id);
  const query = qs.toString();
  return apiFetch<AlertsResponse>(`/api/alerts${query ? `?${query}` : ""}`);
};

export const getRecoverableSummary = (): Promise<RecoverableSummary> =>
  apiFetch<RecoverableSummary>("/api/recoverable-summary");

export const getCustomerRisk = (id: string): Promise<CustomerRisk> =>
  apiFetch<CustomerRisk>(`/api/customer/${id}/risk`);

export const getCustomerExplain = (id: string): Promise<CustomerExplain> =>
  apiFetch<CustomerExplain>(`/api/customer/${id}/explain`);

export const getHealth = (): Promise<HealthResponse> =>
  apiFetch<HealthResponse>("/api/health");

/* ── Write endpoints ────────────────────────────────────── */

export const postChat = (body: ChatRequest): Promise<ChatResponse> =>
  apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const postExecuteAction = (
  body: ActionExecuteRequest
): Promise<ActionExecuteResponse> =>
  apiFetch<ActionExecuteResponse>("/api/actions/execute", {
    method: "POST",
    body: JSON.stringify(body),
  });

/* ── Data ingestion ─────────────────────────────────────────── */

export async function uploadDataset(
  file: File,
  onProgress?: (pct: number) => void
): Promise<import("../types/interfaces").DataUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // Simulate progress in dev/MSW mode since XHR progress events don't fire on fetch
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  if (onProgress) {
    let pct = 0;
    progressTimer = setInterval(() => {
      pct = Math.min(pct + Math.random() * 18, 90);
      onProgress(Math.round(pct));
    }, 120);
  }

  try {
    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      // DO NOT set Content-Type — browser sets multipart boundary automatically
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error((err as { detail?: string }).detail ?? "Upload failed");
    }
    return res.json() as Promise<import("../types/interfaces").DataUploadResponse>;
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    onProgress?.(100);
  }
}
