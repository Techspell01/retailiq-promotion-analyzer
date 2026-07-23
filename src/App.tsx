import { useState, useEffect, useCallback } from 'react';
import LoginPage from './LoginPage';
import MenuPage from './MenuPage';
import ExistingPromotionPage from './ExistingPromotionPage';
import ComingSoonPage from './ComingSoonPage';
import RefreshPage from './RefreshPage';
import ChatPage from './ChatPage';
import ConversationsPage from './ConversationsPage';
import type { AppScreen, ChatContext, Conversation } from './types';
import { getUsername, clearToken, isAuthenticated } from './auth';
import { setUnauthorizedHandler, extractPromotionName } from './api';
import './index.css';

export default function App() {
  const [clientEmail, setClientEmail] = useState<string | null>(() => getUsername());
  const [screen, setScreen] = useState<AppScreen>(() => (isAuthenticated() ? 'menu' : 'login'));
  const [chatCtx, setChatCtx] = useState<ChatContext | null>(null);

  const logout = useCallback(() => {
    clearToken();
    setClientEmail(null);
    setScreen('login');
    setChatCtx(null);
  }, []);

  // Any 401 from the API bounces the user back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const goMenu = () => setScreen('menu');

  if (!clientEmail || screen === 'login') {
    return <LoginPage onLogin={(username) => { setClientEmail(username); setScreen('menu'); }} />;
  }

  if (screen === 'menu') {
    return (
      <MenuPage
        clientEmail={clientEmail}
        onLogout={logout}
        onExisting={() => setScreen('existing-select')}
        onNew={() => setScreen('new-promotion-soon')}
        onRefresh={() => setScreen('refresh')}
        onConversations={() => setScreen('conversations')}
      />
    );
  }

  if (screen === 'existing-select') {
    return (
      <ExistingPromotionPage
        onBack={goMenu}
        onAnalyse={(conversation, promotion) => {
          setChatCtx({ mode: 'existing', conversation, promotion });
          setScreen('chat');
        }}
      />
    );
  }

  if (screen === 'new-promotion-soon') {
    return <ComingSoonPage onBack={goMenu} />;
  }

  if (screen === 'conversations') {
    return (
      <ConversationsPage
        onBack={goMenu}
        onResume={(conversation: Conversation) => {
          setChatCtx({
            mode: 'resumed',
            conversation,
            promotion: {
              promotion_id: conversation.promotion_id ?? 0,
              promotion_name: extractPromotionName(conversation),
              promotion_type: 'Promotion',
              start_date: '',
              end_date: '',
            },
          });
          setScreen('chat');
        }}
      />
    );
  }

  if (screen === 'refresh') {
    return <RefreshPage onDone={goMenu} />;
  }

  if (screen === 'chat' && chatCtx && clientEmail) {
    return (
      <ChatPage
        clientEmail={clientEmail}
        chatCtx={chatCtx}
        onBack={goMenu}
        onLogout={logout}
      />
    );
  }

  return null;
}
