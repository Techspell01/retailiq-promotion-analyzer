import React from 'react';

interface MenuPageProps {
  clientEmail: string;
  onLogout: () => void;
  onExisting: () => void;
  onNew: () => void;
  onRefresh: () => void;
  onConversations: () => void;
}

export default function MenuPage({ clientEmail, onLogout, onExisting, onNew, onRefresh, onConversations }: MenuPageProps) {
  return (
    <div style={s.root}>
      <div style={s.grid} />
      <div style={s.glow} />

      <div style={s.layout}>
        {/* Top bar */}
        <header style={s.topbar}>
          <div style={s.brand}>
            <div style={s.logoMark}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14l3.5 7L10 14l-3.5-4L3 14z" fill="var(--accent)" />
              </svg>
            </div>
            <span style={s.brandName}>RetailIQ</span>
          </div>
          <div style={s.topbarRight}>
            <button style={s.logoutBtn} onClick={onConversations}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Past Conversations
            </button>
            <div style={s.clientBadge}>
              <div style={s.avatarSm}>{clientEmail[0].toUpperCase()}</div>
              <span style={s.clientEmailText}>{clientEmail}</span>
            </div>
            <button style={s.logoutBtn} onClick={onLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroEyebrow}>
            <div style={s.pulseDot} />
            AI Agent Ready
          </div>
          <h1 style={s.heroTitle}>Promotion Performance<br />Analyst</h1>
          <p style={s.heroSub}>
            Evaluate campaigns, uncover performance drivers, and surface actionable recommendations — powered by an autonomous AI agent.
          </p>
        </div>

        {/* Cards */}
        <div style={s.cards}>
          <MenuCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            label="Option 1"
            title="Analyse Existing Promotion"
            description="Select a past or active campaign from your promotion library and get a full AI-driven performance breakdown."
            accent="var(--accent)"
            onClick={onExisting}
            badge="Library"
          />
          <MenuCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            }
            label="Option 2"
            title="Analyse New Promotion"
            description="Enter the details of an upcoming or hypothetical promotion and receive predictive insights before launch."
            accent="#7c6dfa"
            onClick={onNew}
            badge="Coming Soon"
          />
          <MenuCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            }
            label="Option 3"
            title="Refresh Data"
            description="Sync the latest sales, inventory, and promotion records from your data warehouse into the analytics engine."
            accent="#fa8c3e"
            onClick={onRefresh}
            badge="Sync"
          />
        </div>

        <p style={s.footer}>Retail Promotion Performance Analyst · Confidential · {new Date().getFullYear()}</p>
      </div>

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:0.5;transform:scale(0.9)} 50%{opacity:1;transform:scale(1.1)} }
        .menu-card:hover .card-arrow { transform: translateX(4px) !important; }
      `}</style>
    </div>
  );
}

interface MenuCardProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
  badge: string;
}

function MenuCard({ icon, label, title, description, accent, onClick, badge }: MenuCardProps) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      className="menu-card"
      style={{
        ...s.card,
        borderColor: hovered ? accent + '55' : 'var(--border)',
        boxShadow: hovered ? `0 0 0 1px ${accent}33, 0 8px 32px rgba(0,0,0,0.4)` : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.cardTop}>
        <div style={{ ...s.iconWrap, background: accent + '18', border: `1px solid ${accent}33`, color: accent }}>
          {icon}
        </div>
        <span style={{ ...s.badge, background: accent + '18', color: accent, borderColor: accent + '33' }}>{badge}</span>
      </div>
      <div style={s.cardLabel}>{label}</div>
      <h3 style={s.cardTitle}>{title}</h3>
      <p style={s.cardDesc}>{description}</p>
      <div style={s.cardFooter}>
        <span style={{ ...s.cardCta, color: accent }}>Get started</span>
        <span className="card-arrow" style={{ ...s.cardArrow, color: accent, transition: 'transform 0.2s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: 'var(--bg-primary)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '48px 48px', opacity: 0.3,
  },
  glow: {
    position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
    width: '800px', height: '500px',
    background: 'radial-gradient(ellipse,rgba(0,200,160,0.07) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  layout: {
    width: '100%', maxWidth: '1000px',
    padding: '0 24px 48px', position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  topbar: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 0', marginBottom: '8px',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoMark: {
    width: '32px', height: '32px',
    background: 'var(--accent-dim)', border: '1px solid rgba(0,200,160,0.2)',
    borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.02em',
  },
  topbarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  clientBadge: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '5px 12px 5px 6px',
  },
  avatarSm: {
    width: '22px', height: '22px', borderRadius: '50%',
    background: 'var(--accent)', color: '#080c10',
    fontWeight: 700, fontSize: '11px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  clientEmailText: { fontSize: '12px', color: 'var(--text-secondary)' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '6px 12px',
    color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  hero: {
    textAlign: 'center', padding: '40px 0 48px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
  },
  heroEyebrow: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--accent-dim)', border: '1px solid rgba(0,200,160,0.2)',
    borderRadius: '20px', padding: '5px 14px',
    fontSize: '12px', color: 'var(--accent)', fontWeight: 600,
    letterSpacing: '0.04em',
  },
  pulseDot: {
    width: '7px', height: '7px', borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'pulse-dot 2s ease-in-out infinite',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15,
  },
  heroSub: {
    fontSize: '15px', color: 'var(--text-secondary)',
    lineHeight: 1.7, maxWidth: '520px',
  },
  cards: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px', width: '100%',
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '28px 24px',
    textAlign: 'left', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: '10px',
    transition: 'all 0.2s ease',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: {
    width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    fontSize: '10px', fontWeight: 700,
    padding: '3px 8px', borderRadius: '20px',
    border: '1px solid', letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  cardLabel: {
    fontSize: '10px', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em',
    marginTop: '4px',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: '13px', color: 'var(--text-secondary)',
    lineHeight: 1.65, flexGrow: 1,
  },
  cardFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: '8px', paddingTop: '16px',
    borderTop: '1px solid var(--border)',
  },
  cardCta: { fontSize: '13px', fontWeight: 600 },
  cardArrow: { display: 'flex' },
  footer: { marginTop: '48px', fontSize: '11px', color: 'var(--text-muted)' },
};
