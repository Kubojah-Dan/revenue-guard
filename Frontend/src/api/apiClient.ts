/**
 * apiClient.ts - Typed fetch wrappers for all Revenue Process Twin API routes.
 *
 * Configuration:
 *   VITE_API_BASE_URL  - FastAPI backend  (e.g. http://localhost:8000)
 *   VITE_OLLAMA_URL    - Ollama local LLM (e.g. http://localhost:11434)
 *   VITE_OLLAMA_MODEL  - Model name        (default: "llama3")
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
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "llama3";

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

/* -- Core Analytical Read Endpoints -------------------------------- */

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

export const getAuditLog = (params?: { page?: number; page_size?: number }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const query = qs.toString();
  return apiFetch<any>(`/api/audit${query ? `?${query}` : ""}`);
};

/* -- Actions & Chat ------------------------------------------------ */

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

/* -- AI Narrator - Ollama streaming -------------------------------- */

export async function* streamOllamaChat(
  prompt: string,
  systemPrompt = "You are the Revenue Process Twin AI Narrator. You have access to revenue leakage data, customer risk profiles, and process conformance results. Answer concisely in plain text. Focus on financial impact and recovery actions."
): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        if (parsed.message?.content) {
          yield parsed.message.content;
        }
        if (parsed.done) return;
      } catch {
        // partial chunk
      }
    }
  }
}

/* -- Universal Ingestion Pipeline ---------------------------------- */

export const createIngestionJob = (payload: {
  source_name: string;
  source_type?: string;
  format?: string;
}): Promise<any> =>
  apiFetch<any>("/api/ingestions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getIngestionPreview = (ingestionId: string): Promise<any> =>
  apiFetch<any>(`/api/ingestions/${ingestionId}/preview`);

export const submitSchemaMapping = (
  ingestionId: string,
  payload: { mapping?: Record<string, string>; auto_map?: boolean }
): Promise<any> =>
  apiFetch<any>(`/api/ingestions/${ingestionId}/mapping`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const validateIngestion = (ingestionId: string): Promise<any> =>
  apiFetch<any>(`/api/ingestions/${ingestionId}/validate`, {
    method: "POST",
  });

export const runIngestion = (ingestionId: string): Promise<any> =>
  apiFetch<any>(`/api/ingestions/${ingestionId}/run`, {
    method: "POST",
  });

export const getIngestionStatus = (ingestionId: string): Promise<any> =>
  apiFetch<any>(`/api/ingestions/${ingestionId}`);

export const commitIngestion = (ingestionId: string): Promise<any> =>
  apiFetch<any>(`/api/ingestions/${ingestionId}/commit`, {
    method: "POST",
  });

export const listIngestions = (params?: { page?: number; page_size?: number; status?: string }): Promise<any> => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiFetch<any>(`/api/ingestions${query ? `?${query}` : ""}`);
};

/* -- Streaming Pipeline -------------------------------------------- */

export const createStream = (payload: { source_name: string; event_type?: string }): Promise<any> =>
  apiFetch<any>("/api/streams", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const postStreamEvent = (streamId: string, event: Record<string, any>): Promise<any> =>
  apiFetch<any>(`/api/streams/${streamId}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });

export const getStreamStatus = (streamId: string): Promise<any> =>
  apiFetch<any>(`/api/streams/${streamId}`);

export const stopStream = (streamId: string): Promise<any> =>
  apiFetch<any>(`/api/streams/${streamId}/stop`, {
    method: "POST",
  });

/* -- Quick Upload (Dataset) ---------------------------------------- */

export async function uploadDataset(
  file: File,
  onProgress?: (pct: number) => void
): Promise<import("../types/interfaces").DataUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/api/upload`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 95));
      }
    });

    xhr.addEventListener("load", () => {
      onProgress?.(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid JSON response from upload endpoint"));
        }
      } else {
        try {
          const errBody = JSON.parse(xhr.responseText) as { detail?: string };
          reject(new Error(errBody.detail ?? `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.send(formData);
  });
}
