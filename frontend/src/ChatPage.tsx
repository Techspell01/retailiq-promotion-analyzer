import { useRef, useEffect, useState } from 'react';
import type { ChatContext } from './types';
import { useConversationSocket } from './useConversationSocket';
import { FormattedMessage } from './FormattedMessage';

interface ChatPageProps {
  clientEmail: string;
  chatCtx: ChatContext;
  onBack: () => void;
  onLogout: () => void;
}

export default function ChatPage({ clientEmail, chatCtx, onBack, onLogout }: ChatPageProps) {
  const { promotion, conversation, mode } = chatCtx;
  const { messages, status, awaitingServer, sendMessage } = useConversationSocket(
    conversation.conversation_id,
    promotion.promotion_id,
  );

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const adjustTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const inputDisabled = awaitingServer || status !== 'open';

  const handleSend = () => {
    const text = input.trim();
    if (!text || inputDisabled) return;
    sendMessage(text);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickPrompts = [
    'What were the main stockout events?',
    'Explain the pull-forward effect in detail',
    'How does this compare to similar past promotions?',
    'What discount level would maximise ROI?',
    'Which SKUs underperformed and why?',
  ];

  const promoTypeColor: Record<string, string> = {
    'BOGO': '#00c8a0', 'Percentage Discount': '#7c6dfa',
    'Bundle': '#fa8c3e', 'Clearance': '#ff4757',
  };
  const accentColor = promoTypeColor[promotion.promotion_type] ?? 'var(--accent)';

  const loadingLabel =
    status === 'connecting' ? 'Connecting…'
      : status === 'closed' ? 'Disconnected'
      : status === 'error' ? 'Connection error'
      : awaitingServer && messages.length === 0 ? 'Loading conversation…'
      : awaitingServer ? 'Analyzing…'
      : '';

  return (
    <div style={s.root}>
      {/* Sidebar */}
      <aside style={{ ...s.sidebar, width: sidebarOpen ? '280px' : '0px', minWidth: sidebarOpen ? '280px' : '0px' }}>
        <div style={s.sidebarInner}>
          <div style={s.sidebarBrand}>
            <div style={s.logoMark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14l3.5 7L10 14l-3.5-4L3 14z" fill="var(--accent)" />
              </svg>
            </div>
            <span style={s.brandText}>RetailIQ</span>
          </div>

          {/* Promotion summary */}
          <div style={s.promoSummary}>
            <div style={s.promoSummaryHeader}>
              <span style={s.promoSummaryEye}>{mode === 'existing' ? 'Existing' : 'Resumed'} Conversation</span>
              <span style={{ ...s.typeTag, background: accentColor + '18', color: accentColor, borderColor: accentColor + '44' }}>
                {promotion.promotion_type}
              </span>
            </div>
            <div style={s.promoSummaryName}>{promotion.promotion_name}</div>
            {promotion.promotion_description && (
              <div style={s.promoSummaryDesc}>{promotion.promotion_description}</div>
            )}
            <div style={s.promoSummaryMeta}>
              {promotion.discount_percent != null && (
                <div style={s.metaRow}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                  {promotion.discount_percent}% discount
                </div>
              )}
              {promotion.start_date && (
                <div style={s.metaRow}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {fmtDate(promotion.start_date)}
                </div>
              )}
              {promotion.end_date && (
                <div style={s.metaRow}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {fmtDate(promotion.end_date)}
                </div>
              )}
            </div>
          </div>

          {/* Quick prompts */}
          <div style={s.sideSection}>
            <div style={s.sectionLabel}>Quick Questions</div>
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                style={{ ...s.quickBtn, opacity: inputDisabled ? 0.5 : 1, cursor: inputDisabled ? 'not-allowed' : 'pointer' }}
                disabled={inputDisabled}
                onClick={() => { setInput(p); textareaRef.current?.focus(); }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {p}
              </button>
            ))}
          </div>

          <div style={s.sidebarFooter}>
            <div style={s.clientChip}>
              <div style={s.avatar}>{clientEmail[0].toUpperCase()}</div>
              <div style={s.clientInfo}>
                <span style={s.clientLabel}>Authorized Client</span>
                <span style={s.clientEmail}>{clientEmail}</span>
              </div>
            </div>
            <div style={s.footerBtns}>
              <button style={s.footerBtn} onClick={onBack}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Dashboard
              </button>
              <button style={s.footerBtn} onClick={onLogout}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.iconBtn} onClick={() => setSidebarOpen(v => !v)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <h1 style={s.headerTitle}>{promotion.promotion_name}</h1>
              <div style={s.headerSub}>
                <div style={{ ...s.onlineDot, background: status === 'open' ? 'var(--accent)' : status === 'error' || status === 'closed' ? 'var(--danger)' : 'var(--text-muted)' }} />
                {status === 'open' ? 'AI Agent Active' : status === 'connecting' ? 'Connecting…' : status === 'closed' ? 'Disconnected' : 'Connection error'}
                <span style={s.separator}>·</span>
                <span style={{ color: accentColor }}>{promotion.promotion_type}</span>
              </div>
            </div>
          </div>
        </header>

        <div style={s.messages}>
          {messages.map(msg => (
            <div key={msg.id} style={{ ...s.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role !== 'user' && (
                <div style={{ ...s.agentAvatar, background: msg.role === 'error' ? 'var(--danger-dim)' : 'var(--accent-dim)', borderColor: msg.role === 'error' ? 'rgba(255,71,87,0.3)' : 'rgba(0,200,160,0.2)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14l3.5 7L10 14l-3.5-4L3 14z" fill={msg.role === 'error' ? 'var(--danger)' : 'var(--accent)'} />
                  </svg>
                </div>
              )}
              <div style={{ ...s.bubble, ...(msg.role === 'user' ? s.userBubble : msg.role === 'error' ? s.errorBubble : s.aiBubble) }}>
                <div style={s.msgContent}><FormattedMessage content={msg.content} /></div>
                <div style={{ ...s.msgTime, color: msg.role === 'user' ? 'rgba(8,12,16,0.5)' : 'var(--text-muted)' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {msg.role === 'user' && (
                <div style={s.userAvatar}>{clientEmail[0].toUpperCase()}</div>
              )}
            </div>
          ))}
          {awaitingServer && (
            <div style={{ ...s.msgRow, justifyContent: 'flex-start' }}>
              <div style={s.agentAvatar}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14l3.5 7L10 14l-3.5-4L3 14z" fill="var(--accent)" />
                </svg>
              </div>
              <div style={{ ...s.bubble, ...s.aiBubble }}>
                <div style={s.typingDots}><span style={s.dot1} /><span style={s.dot2} /><span style={s.dot3} /></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={s.inputArea}>
          <div style={s.inputBox}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder={inputDisabled ? loadingLabel || 'Please wait…' : 'Ask a follow-up question about this promotion… (Enter to send)'}
              rows={1}
              style={s.textarea}
              disabled={inputDisabled}
            />
            <button onClick={handleSend} disabled={!input.trim() || inputDisabled} style={{ ...s.sendBtn, opacity: !input.trim() || inputDisabled ? 0.4 : 1 }}>
              {awaitingServer
                ? <span style={s.sendSpinner} />
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
            </button>
          </div>
          <p style={s.inputHint}>AI responses are analytical suggestions — validate with your own data before acting.</p>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot-bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        textarea::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const dotStyle = (delay: string): React.CSSProperties => ({
  width: '7px', height: '7px', borderRadius: '50%',
  background: 'var(--text-muted)',
  animation: `dot-bounce 1.4s ease-in-out ${delay} infinite`,
  display: 'inline-block',
});

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' },
  sidebar: { background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', transition: 'width 0.25s ease, min-width 0.25s ease', flexShrink: 0, overflow: 'hidden' },
  sidebarInner: { width: '280px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 18px 16px', borderBottom: '1px solid var(--border)' },
  logoMark: { width: '28px', height: '28px', background: 'var(--accent-dim)', border: '1px solid rgba(0,200,160,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  promoSummary: { padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' },
  promoSummaryHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  promoSummaryEye: { fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  typeTag: { fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', border: '1px solid' },
  promoSummaryName: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 },
  promoSummaryDesc: { fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  promoSummaryMeta: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' },
  metaRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' },
  sideSection: { padding: '14px 12px 8px' },
  sectionLabel: { fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', padding: '0 6px', marginBottom: '6px' },
  quickBtn: { display: 'flex', alignItems: 'flex-start', gap: '7px', width: '100%', padding: '7px 8px', background: 'none', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'left', lineHeight: 1.45, transition: 'all 0.12s' },
  sidebarFooter: { marginTop: 'auto', padding: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  clientChip: { display: 'flex', alignItems: 'center', gap: '9px', padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  avatar: { width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#080c10', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  clientInfo: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  clientLabel: { fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' },
  clientEmail: { fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  footerBtns: { display: 'flex', gap: '8px' },
  footerBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 8px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '60px', flexShrink: 0, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' },
  headerSub: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' },
  onlineDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' },
  separator: { color: 'var(--text-muted)' },
  iconBtn: { width: '34px', height: '34px', background: 'none', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: '18px' },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '10px' },
  agentAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(0,200,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#080c10', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '74%', padding: '13px 16px', borderRadius: 'var(--radius-md)', fontSize: '14px', lineHeight: 1.7 },
  aiBubble: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderBottomLeftRadius: '4px' },
  errorBubble: { background: 'var(--danger-dim)', border: '1px solid rgba(255,71,87,0.3)', color: 'var(--danger)', borderBottomLeftRadius: '4px' },
  userBubble: { background: 'var(--accent)', color: '#080c10', fontWeight: 500, borderBottomRightRadius: '4px' },
  msgContent: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  msgTime: { fontSize: '10px', marginTop: '7px', opacity: 0.55 },
  typingDots: { display: 'flex', gap: '5px', alignItems: 'center', padding: '3px 0' },
  dot1: dotStyle('0s'),
  dot2: dotStyle('0.2s'),
  dot3: dotStyle('0.4s'),
  inputArea: { padding: '14px 24px 20px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', flexShrink: 0 },
  inputBox: { display: 'flex', alignItems: 'flex-end', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' },
  textarea: { flex: 1, resize: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6, maxHeight: '160px', overflowY: 'auto' },
  sendBtn: { width: '34px', height: '34px', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', color: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', flexShrink: 0, transition: 'opacity 0.2s' },
  sendSpinner: { width: '14px', height: '14px', border: '2px solid rgba(8,12,16,0.3)', borderTopColor: '#080c10', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  inputHint: { marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' },
};
