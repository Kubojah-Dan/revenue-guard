/**
 * MSW handlers — empty handlers array so all requests pass through directly to live FastAPI backend.
 */
import type { HttpHandler } from "msw";

export const handlers: HttpHandler[] = [];

