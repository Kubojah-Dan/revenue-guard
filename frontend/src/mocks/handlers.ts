/**
 * MSW handlers — built from mock_api.json, maps all 7 API routes.
 */
import { http, HttpResponse } from "msw";
import mockData from "./mock_api.json";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export const handlers = [
  // GET /api/alerts
  http.get(`${BASE}/api/alerts`, () => {
    return HttpResponse.json(mockData["GET /api/alerts"]);
  }),

  // GET /api/recoverable-summary
  http.get(`${BASE}/api/recoverable-summary`, () => {
    return HttpResponse.json(mockData["GET /api/recoverable-summary"]);
  }),

  // GET /api/health
  http.get(`${BASE}/api/health`, () => {
    return HttpResponse.json(mockData["GET /api/health"]);
  }),

  // GET /api/customer/:id/risk  (dynamic path param)
  http.get(`${BASE}/api/customer/:id/risk`, ({ params }) => {
    const id = params.id as string;
    const riskMap = mockData["GET /api/customer/{id}/risk"] as Record<string, unknown>;
    const data = riskMap[id];
    if (!data) {
      return HttpResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return HttpResponse.json(data);
  }),

  // GET /api/customer/:id/explain  (dynamic path param)
  http.get(`${BASE}/api/customer/:id/explain`, ({ params }) => {
    const id = params.id as string;
    const explainMap = mockData["GET /api/customer/{id}/explain"] as Record<string, unknown>;
    const data = explainMap[id];
    if (!data) {
      return HttpResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return HttpResponse.json(data);
  }),

  // POST /api/chat  — match query to canned responses
  http.post(`${BASE}/api/chat`, async ({ request }) => {
    const body = (await request.json()) as { query: string };
    const chats = mockData["POST /api/chat"] as Array<{
      query: string;
      response: unknown;
    }>;
    // Case-insensitive partial match
    const match = chats.find((c) =>
      c.query.toLowerCase().includes(body.query.toLowerCase().slice(0, 10)) ||
      body.query.toLowerCase().includes(c.query.toLowerCase().slice(0, 10))
    );
    // Default: return first canned response
    const result = match ? match.response : chats[0].response;
    return HttpResponse.json(result);
  }),

  // POST /api/actions/execute
  http.post(`${BASE}/api/actions/execute`, () => {
    return HttpResponse.json(mockData["POST /api/actions/execute"]);
  }),

  // POST /api/upload — data ingestion
  http.post(`${BASE}/api/upload`, async ({ request }) => {
    // Simulate a brief 600ms processing delay
    await new Promise((r) => setTimeout(r, 600));

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return HttpResponse.json({ detail: "No file provided" }, { status: 400 });
    }

    const name = file.name ?? "dataset";
    const ext = ("." + name.split(".").pop()?.toLowerCase()) as string;
    const allowed = [".xlsx", ".xls", ".csv", ".json", ".zip"];

    if (!allowed.includes(ext)) {
      return HttpResponse.json(
        { detail: `Unsupported file type: ${ext}. Accepted: ${allowed.join(", ")}` },
        { status: 422 }
      );
    }

    // Canned realistic response
    const tableMap: Record<string, string[]> = {
      ".xlsx": ["invoices", "payments"],
      ".xls":  ["invoices", "payments"],
      ".csv":  ["events"],
      ".json": ["alerts", "customers"],
      ".zip":  ["invoices", "payments", "events", "customers"],
    };
    const recordMap: Record<string, number> = {
      ".xlsx": 142, ".xls": 98, ".csv": 310, ".json": 58, ".zip": 524,
    };

    return HttpResponse.json({
      filename: name,
      file_type: ext,
      records_processed: recordMap[ext] ?? 100,
      tables_updated: tableMap[ext] ?? ["events"],
      status: "success",
      message: `Successfully ingested ${recordMap[ext] ?? 100} records into ${(tableMap[ext] ?? []).join(", ")} and refreshed leakage engine.`,
    });
  }),
];
