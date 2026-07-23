import { useState } from 'react';
import { login, ApiError } from './api';
import { setToken } from './auth';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await login(username, password);
      setToken(token, username);
      onLogin(username);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Background grid */}
      <div style={styles.grid} />
      {/* Accent glow */}
      <div style={styles.glow} />

      <div style={styles.wrapper}>
        {/* Brand header */}
        <div style={styles.brand}>
          <div style={styles.logoMark}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14l3.5 7L10 14l-3.5-4L3 14z" fill="var(--accent)" opacity="0.9"/>
            </svg>
          </div>
          <span style={styles.brandName}>RetailIQ</span>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.lockIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h1 style={styles.title}>Restricted Access</h1>
            <p style={styles.subtitle}>This platform is reserved for authorized clients only. Enter your credentials to proceed.</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Username</label>
              <div style={styles.inputWrap}>
                <svg style={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your-username"
                  required
                  autoComplete="username"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <svg style={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  style={styles.input}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              ...styles.submitBtn,
              opacity: loading ? 0.75 : 1,
            }}>
              {loading ? (
                <span style={styles.spinner} />
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div style={styles.badge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Secured · Single-client access control
          </div>
        </div>

        <p style={styles.footer}>
          Retail Promotion Performance Analyst · Confidential
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--text-muted); }
        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-glow) !important; }
        button[type=submit]:hover:not(:disabled) { background: #00ddb3 !important; transform: translateY(-1px); box-shadow: 0 4px 20px var(--accent-glow); }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
    opacity: 0.35,
  },
  glow: {
    position: 'absolute', top: '-20%', left: '50%',
    transform: 'translateX(-50%)',
    width: '600px', height: '400px',
    background: 'radial-gradient(ellipse, rgba(0,200,160,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  wrapper: {
    width: '100%', maxWidth: '420px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px',
    position: 'relative', zIndex: 1,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  logoMark: {
    width: '36px', height: '36px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(0,200,160,0.25)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px', fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  card: {
    width: '100%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    boxShadow: 'var(--shadow-elevated)',
  },
  cardHeader: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '10px', marginBottom: '28px', textAlign: 'center',
  },
  lockIcon: {
    width: '48px', height: '48px',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(0,200,160,0.2)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '4px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px', fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '13px', color: 'var(--text-secondary)',
    lineHeight: 1.6, maxWidth: '300px',
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: '18px',
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: '7px',
  },
  label: {
    fontSize: '12px', fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  inputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: '13px',
    color: 'var(--text-muted)', pointerEvents: 'none',
  },
  input: {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 40px 11px 38px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute', right: '12px',
    background: 'none', border: 'none',
    color: 'var(--text-muted)', padding: '4px',
    display: 'flex', alignItems: 'center',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--danger-dim)',
    border: '1px solid rgba(255,71,87,0.25)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--danger)',
    fontSize: '12.5px', lineHeight: 1.5,
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: 'var(--accent)',
    color: '#080c10',
    fontWeight: 700, fontSize: '14px',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
    marginTop: '4px',
  },
  spinner: {
    width: '16px', height: '16px',
    border: '2px solid rgba(8,12,16,0.3)',
    borderTopColor: '#080c10',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  badge: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    marginTop: '20px',
    fontSize: '11px', color: 'var(--text-muted)',
  },
  footer: {
    fontSize: '11px', color: 'var(--text-muted)',
  },
};
