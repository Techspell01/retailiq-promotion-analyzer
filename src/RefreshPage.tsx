import React, { useEffect, useState } from 'react';
import { reloadData, ApiError } from './api';

interface Props { onDone: () => void; }

type Phase = 'loading' | 'done' | 'error';

export default function RefreshPage({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');

  const run = () => {
    setPhase('loading');
    setError('');
    reloadData()
      .then(() => setPhase('done'))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Could not refresh data. Please try again.');
        setPhase('error');
      });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={s.root}>
      <div style={s.grid} />
      <div style={s.glow} />

      <div style={s.card}>
        {phase === 'loading' && (
          <>
            <div style={s.ringWrap}>
              <div style={s.ringOuter} />
              <div style={s.ringCore}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </div>
            </div>
            <h2 style={s.title}>Refreshing Data</h2>
            <p style={s.subtitle}>
              Syncing the latest records from your data warehouse. This may take a while — the
              server doesn't report progress, so please be patient until it completes.
            </p>
          </>
        )}

        {phase === 'done' && (
          <>
            <div style={s.doneRing}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={s.title}>Data Refreshed</h2>
            <p style={s.subtitle}>All records are up to date. The analytics engine is ready.</p>
            <button style={s.doneBtn} onClick={onDone}>
              Back to Dashboard
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <div style={s.errorRing}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={s.title}>Refresh Failed</h2>
            <p style={s.subtitle}>{error}</p>
            <div style={s.errorActions}>
              <button style={s.retryBtn} onClick={run}>Retry</button>
              <button style={s.backBtn} onClick={onDone}>Back to Dashboard</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: 'var(--bg-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '48px 48px', opacity: 0.3,
  },
  glow: {
    position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
    width: '600px', height: '400px',
    background: 'radial-gradient(ellipse,rgba(250,140,62,0.1) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '48px 40px',
    width: '100%', maxWidth: '440px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center',
    boxShadow: 'var(--shadow-elevated)',
    animation: 'fade-in 0.4s ease',
  },
  ringWrap: {
    position: 'relative', width: '90px', height: '90px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute', inset: 0,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  ringCore: {
    width: '54px', height: '54px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  doneRing: {
    width: '90px', height: '90px', borderRadius: '50%',
    background: 'var(--accent-dim)', border: '2px solid rgba(0,200,160,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorRing: {
    width: '80px', height: '80px', borderRadius: '50%',
    background: 'var(--danger-dim)', border: '2px solid rgba(255,71,87,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.65,
  },
  doneBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--accent)', color: '#080c10',
    fontWeight: 700, fontSize: '14px',
    padding: '12px 28px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
    transition: 'all 0.2s', marginTop: '8px',
  },
  errorActions: { display: 'flex', gap: '10px', marginTop: '8px' },
  retryBtn: {
    background: 'var(--accent)', color: '#080c10', fontWeight: 700, fontSize: '14px',
    padding: '12px 24px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
  },
  backBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
    fontSize: '14px', padding: '12px 24px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  },
};
