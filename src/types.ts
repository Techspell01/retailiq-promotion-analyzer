export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  clientEmail: string | null;
}

// Matches backend PromotionResponse (api/models/data_models.py)
export interface Promotion {
  promotion_id: number;
  promotion_name: string;
  promotion_description?: string | null;
  promotion_type: string;
  discount_percent?: number | null;
  start_date: string;
  end_date: string;
}

// Matches backend ConversationResponse (api/models/data_models.py)
export interface Conversation {
  conversation_id: number;
  conversation_title: string;
  user_id: number;
  created_at: string;
  // Not returned directly by the backend today - parsed from conversation_title
  // ("{promotion_id}-{promotion_name}-{created_at}") on a best-effort basis,
  // or carried forward client-side when the conversation is created in this session.
  promotion_id?: number | null;
}

export type AppScreen =
  | 'login'
  | 'menu'
  | 'existing-select'
  | 'new-promotion-soon'
  | 'refresh'
  | 'chat'
  | 'conversations';

export interface ChatContext {
  mode: 'existing' | 'resumed';
  promotion: Promotion;
  conversation: Conversation;
}

// ---- WebSocket protocol shapes (api/routes/conversation_routes.py) ----

export interface WSHistoryEvent {
  type: 'history';
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string | null;
  }[];
}

export interface WSMessageEvent {
  type: 'message';
  role: 'assistant';
  content: string;
}

export interface WSErrorEvent {
  type: 'error';
  content: string;
}

export type WSEvent = WSHistoryEvent | WSMessageEvent | WSErrorEvent;
