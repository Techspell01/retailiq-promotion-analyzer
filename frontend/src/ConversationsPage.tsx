import React, { useEffect, useState } from 'react';
import type { Conversation } from './types';
import { fetchConversations, ApiError } from './api';

interface Props {
  onBack: () => void;
  onResume: (conversation: Conversation) => void;
}

export default function ConversationsPage({ onBack, onResume }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load conversations.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.root}>
      <div style={s.grid} />
      <div style={s.inner}>
        <div style={s.pageHeader}>
          <button style={s.backBtn} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        </div>

        <div style={s.titleBlock}>
          <h2 style={s.pageTitle}>Past Conversations</h2>
          <p style={s.pageSub}>Resume a previous promotion analysis conversation.</p>
        </div>

        {loading ? (
          <div style={s.loadingState}>
            <div style={s.spinner} />
            <span>Loading conversations…</span>
          </div>
        ) : error ? (
          <div style={s.errorState}>{error}</div>
        ) : conversations.length === 0 ? (
          <div style={s.emptyState}>You don't have any conversations yet.</div>
        ) : (
          <div style={s.list}>
            {conversations.map((c) => (
              <button key={c.conversation_id} style={s.convCard} onClick={() => onResume(c)}>
                <div style={s.convTitle}>{cleanTitle(c.conversation_title)}</div>
                <div style={s.convMeta}>{new Date(c.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function cleanTitle(title: string): string {
  // "{promotion_id}-{promotion_name}-{created_at}" -> drop the leading id and trailing timestamp for readability
  const parts = title.split('-');
  if (parts.length > 2) return parts.slice(1, -1).join('-') || title;
  return title;
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: 'var(--bg-primary)',
    display: 'flex', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '48px 48px', opacity: 0.25,
  },
  inner: {
    width: '100%', maxWidth: '760px',
    padding: '20px 24px 60px', position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '7px',
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '7px 14px',
    color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
  },
  titleBlock: { display: 'flex', flexDirection: 'column', gap: '6px' },
  pageTitle: {
    fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.02em',
  },
  pageSub: { fontSize: '14px', color: 'var(--text-secondary)' },
  loadingState: {
    display: 'flex', alignItems: 'center', gap: '12px',
    justifyContent: 'center', padding: '60px 0',
    color: 'var(--text-muted)', fontSize: '14px',
  },
  spinner: {
    width: '18px', height: '18px',
    border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
  errorState: {
    textAlign: 'center', padding: '40px 0',
    color: 'var(--danger)', fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center', padding: '60px 0',
    color: 'var(--text-muted)', fontSize: '14px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  convCard: {
    width: '100%', padding: '16px 20px',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '4px',
    transition: 'all 0.15s',
  },
  convTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  convMeta: { fontSize: '12px', color: 'var(--text-muted)' },
};
