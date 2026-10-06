import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_V1 } from './config';
import { getToken } from './auth';
import type { Message, WSEvent } from './types';

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseConversationSocketResult {
  messages: Message[];
  status: SocketStatus;
  /** True while we're waiting on the server (history load, initial analysis, or a reply). Input should be disabled. */
  awaitingServer: boolean;
  sendMessage: (text: string) => void;
}

export function useConversationSocket(
  conversationId: number,
  promotionId: number | null | undefined,
): UseConversationSocketResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [awaitingServer, setAwaitingServer] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getToken();
    const promo = promotionId ?? '';
    const url = `${WS_V1}/ws/conversation/${conversationId}/${promo}?token=${encodeURIComponent(token ?? '')}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;
    setStatus('connecting');
    setAwaitingServer(true);
    setHistoryLoaded(false);
    setMessages([]);

    socket.onopen = () => setStatus('open');

    socket.onmessage = (event) => {
      let payload: WSEvent;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'history') {
        setMessages(
          payload.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          })),
        );
        setHistoryLoaded(true);
        // If history is non-empty, we're done waiting. If empty, the server will
        // immediately follow up with the initial analysis "message" event below,
        // so keep `awaitingServer` true until that arrives.
        if (payload.messages.length > 0) {
          setAwaitingServer(false);
        }
      } else if (payload.type === 'message') {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: payload.content,
            timestamp: new Date(),
          },
        ]);
        setAwaitingServer(false);
      } else if (payload.type === 'error') {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            role: 'error',
            content: payload.content,
            timestamp: new Date(),
          },
        ]);
        setAwaitingServer(false);
      }
    };

    socket.onerror = () => setStatus('error');
    socket.onclose = () => setStatus('closed');

    return () => {
      socket.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, promotionId]);

  const sendMessage = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: 'user', content: text, timestamp: new Date() },
    ]);
    setAwaitingServer(true);
    socket.send(text);
  }, []);

  return { messages, status, awaitingServer: awaitingServer || !historyLoaded, sendMessage };
}
