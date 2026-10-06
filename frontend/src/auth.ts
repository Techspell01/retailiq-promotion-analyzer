// Token storage for this prototype.
//
// The backend returns the JWT in the JSON body of POST /user/login (it does not
// set an HttpOnly cookie, and a Vite/React SPA cannot create a true HttpOnly
// cookie itself - only a server response header can do that). We therefore keep
// the token in sessionStorage and attach it manually as `Authorization: Bearer`
// on REST calls, and as a `?token=` query param on the WebSocket connection,
// matching exactly how the backend already expects to receive it.

const TOKEN_KEY = 'retailiq_access_token';
const USERNAME_KEY = 'retailiq_username';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, username: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USERNAME_KEY, username);
}

export function getUsername(): string | null {
  return sessionStorage.getItem(USERNAME_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
