import { API_V1 } from './config';
import { getToken, clearToken } from './auth';
import type { Promotion, Conversation } from './types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Fired whenever a request comes back 401, so the app can bounce to /login.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

interface ResponseModel<T> {
  status: number;
  message: string;
  data: T | null;
}

interface PagedResponseModel<T> {
  status: number;
  message: string;
  max_page: number;
  current_page: number;
  data: T | null;
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_V1}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Please check your connection.');
  }

  if (res.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  let body: ResponseModel<T> | PagedResponseModel<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, 'Unexpected response from server.');
  }

  if (!res.ok || body.status >= 400) {
    throw new ApiError(body.status ?? res.status, body.message || 'Something went wrong.');
  }

  return body as unknown as T;
}

// ─── Auth ──────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<string> {
  const res = await request<ResponseModel<{ access_token: string; type: string }>>(
    '/user/login',
    { method: 'POST', body: JSON.stringify({ username, password }) },
    false,
  );
  if (!res.data) throw new ApiError(res.status, res.message);
  return res.data.access_token;
}

// ─── Promotions ────────────────────────────────────────────────

export interface PromotionsPage {
  promotions: Promotion[];
  currentPage: number;
  maxPage: number;
}

export async function fetchPromotionsPage(page: number): Promise<PromotionsPage> {
  const res = await request<PagedResponseModel<Promotion[]>>(`/promotions?page=${page}`);
  return {
    promotions: res.data ?? [],
    currentPage: res.current_page,
    maxPage: res.max_page,
  };
}

export async function fetchPromotion(promotionId: number): Promise<Promotion> {
  const res = await request<ResponseModel<Promotion>>(`/promotions/${promotionId}`);
  if (!res.data) throw new ApiError(res.status, res.message);
  return res.data;
}

// ─── Data reload ───────────────────────────────────────────────

export async function reloadData(): Promise<void> {
  await request<ResponseModel<null>>('/data/reload', { method: 'POST' });
}

// ─── Conversations ─────────────────────────────────────────────

export async function createConversation(promotion: Promotion): Promise<Conversation> {
  const res = await request<ResponseModel<Conversation>>('/conversation', {
    method: 'POST',
    body: JSON.stringify({
      promotion_id: promotion.promotion_id,
      promotion_name: promotion.promotion_name,
    }),
  });
  if (!res.data) throw new ApiError(res.status, res.message);
  // promotion_id isn't returned by the backend - carry it forward client-side.
  return { ...res.data, promotion_id: promotion.promotion_id };
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await request<ResponseModel<Conversation[]>>('/conversations');
  return (res.data ?? []).map(parsePromotionIdFromTitle);
}

export function extractPromotionName(conversation: Conversation): string {
  const match = conversation.conversation_title.match(
    /^\d+-(.+)-\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}.*$/,
  );
  return match ? match[1] : conversation.conversation_title;
}

// conversation_title is generated server-side as "{promotion_id}-{promotion_name}-{created_at}"
// where created_at is Python's `datetime.now()` default str(), e.g. "2024-01-01 10:30:00.123456".
// Best-effort extraction so resumed conversations can show a sensible label and
// reopen the socket with the right promotion context.
function parsePromotionIdFromTitle(conversation: Conversation): Conversation {
  const match = conversation.conversation_title.match(
    /^(\d+)-(.+)-(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}.*)$/,
  );
  if (match) {
    return { ...conversation, promotion_id: parseInt(match[1], 10) };
  }
  const fallback = conversation.conversation_title.match(/^(\d+)-/);
  return { ...conversation, promotion_id: fallback ? parseInt(fallback[1], 10) : null };
}
