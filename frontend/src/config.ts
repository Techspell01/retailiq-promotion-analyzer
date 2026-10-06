// Single source of truth for the backend location.
// Change this (or set VITE_API_BASE_URL in a .env file) to migrate to a different host.
export const API_BASE_URL: string = 'http://localhost:8000'
  // (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

// Derives the websocket base from the REST base (http->ws, https->wss).
export const WS_BASE_URL: string = API_BASE_URL.replace(/^http/, 'ws');

export const API_V1 = `${API_BASE_URL}/api/v1`;
export const WS_V1 = `${WS_BASE_URL}/api/v1`;
