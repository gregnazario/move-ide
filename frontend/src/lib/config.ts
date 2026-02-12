/** Base URL for the backend (Axum) API. Empty string means same-origin (local dev). */
const raw = (import.meta.env.VITE_BACKEND_URL ?? "").trim();
export const BACKEND_URL = raw.replace(/\/+$/, "");
