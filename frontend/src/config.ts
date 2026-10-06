// Single source of truth for the backend location.
// By default the app talks to the server it was loaded from: the FastAPI
// backend serves the built app, and the Vite dev server proxies /api to it
// (see vite.config.ts). Set VITE_API_BASE_URL in a .env file to point the
// frontend at a backend hosted elsewhere.
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || window.location.origin;

// Derives the websocket base from the REST base (http->ws, https->wss).
export const WS_BASE_URL: string = API_BASE_URL.replace(/^http/, 'ws');

export const API_V1 = `${API_BASE_URL}/api/v1`;
export const WS_V1 = `${WS_BASE_URL}/api/v1`;
