import React from 'react';

interface Props {
  onBack: () => void;
}

export default function ComingSoonPage({ onBack }: Props) {
  return (
    <div style={s.root}>
      <div style={s.grid} />
      <div style={s.glow} />
      <div style={s.card}>
        <div style={s.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c6dfa" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <h2 style={s.title}>Coming Soon</h2>
        <p style={s.subtitle}>
          Analysing new or hypothetical promotions is still under development. Check back soon — for now you can
          analyse any existing promotion from your library.
        </p>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: 'var(--bg-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', padding: '24px',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '48px 48px', opacity: 0.3,
  },
  glow: {
    position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
    width: '600px', height: '400px',
    background: 'radial-gradient(ellipse,rgba(124,109,250,0.1) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '48px 40px',
    width: '100%', maxWidth: '440px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center',
    boxShadow: 'var(--shadow-elevated)',
  },
  iconWrap: {
    width: '64px', height: '64px', borderRadius: '50%',
    background: 'rgba(124,109,250,0.12)', border: '1px solid rgba(124,109,250,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65,
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--accent)', color: '#080c10',
    fontWeight: 700, fontSize: '14px',
    padding: '12px 28px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
    transition: 'all 0.2s', marginTop: '8px',
  },
};
