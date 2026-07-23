import React, { useState, useEffect } from 'react';
import type { Promotion, Conversation } from './types';
import { fetchPromotionsPage, createConversation, ApiError } from './api';

interface Props {
  onBack: () => void;
  onAnalyse: (conversation: Conversation, promotion: Promotion) => void;
}

const typeColor: Record<string, string> = {
  'BOGO': '#00c8a0', 'Percentage Discount': '#7c6dfa',
  'Bundle': '#fa8c3e', 'Clearance': '#ff4757', 'default': '#8b9eb5',
};

export default function ExistingPromotionPage({ onBack, onAnalyse }: Props) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [popupPromotion, setPopupPromotion] = useState<Promotion | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchPromotionsPage(page)
      .then((res) => {
        setPromotions(res.promotions);
        setMaxPage(res.maxPage);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load promotions.'))
      .finally(() => setLoading(false));
  }, [page, reloadToken]);

  const filtered = promotions.filter(p =>
    p.promotion_name.toLowerCase().includes(search.toLowerCase()) ||
    p.promotion_type.toLowerCase().includes(search.toLowerCase())
  );

  const openPopup = (promo: Promotion) => {
    setAnalyseError('');
    setPopupPromotion(promo);
  };

  const handleAnalyse = async () => {
    if (!popupPromotion) return;
    setAnalysing(true);
    setAnalyseError('');
    try {
      const conversation = await createConversation(popupPromotion);
      onAnalyse(conversation, popupPromotion);
    } catch (e) {
      setAnalyseError(e instanceof ApiError ? e.message : 'Could not start the analysis. Please try again.');
      setAnalysing(false);
    }
  };

  const pageNumbers = Array.from({ length: maxPage }, (_, i) => i + 1);

  return (
    <div style={s.root}>
      <div style={s.grid} />
      <div style={s.inner}>
        {/* Header */}
        <div style={s.pageHeader}>
          <button style={s.backBtn} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div style={s.headerMeta}>
            <div style={s.logoMark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14l3.5 7L10 14l-3.5-4L3 14z" fill="var(--accent)" />
              </svg>
            </div>
            <span style={s.brandSmall}>RetailIQ</span>
          </div>
        </div>

        <div style={s.titleBlock}>
          <h2 style={s.pageTitle}>Select a Promotion</h2>
          <p style={s.pageSub}>Choose an existing promotion from your library to analyse with the AI agent.</p>
        </div>

        {/* Search */}
        <div style={s.searchWrap}>
          <svg style={s.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search this page by name or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
        </div>

        {/* Scrollable list panel */}
        <div style={s.listPanel}>
          {loading ? (
            <div style={s.loadingState}>
              <div style={s.spinner} />
              <span>Loading promotions…</span>
            </div>
          ) : error ? (
            <div style={s.errorState}>
              {error}
              <button style={s.retryBtn} onClick={() => setReloadToken(t => t + 1)}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={s.emptyState}>No promotions match your search on this page.</div>
          ) : (
            <div style={s.list}>
              {filtered.map(promo => {
                const color = typeColor[promo.promotion_type] ?? typeColor.default;
                return (
                  <button
                    key={promo.promotion_id}
                    style={s.promoCard}
                    onClick={() => openPopup(promo)}
                  >
                    <div style={s.promoCardLeft}>
                      <div style={s.promoInfo}>
                        <div style={s.promoName}>{promo.promotion_name}</div>
                        {promo.promotion_description && (
                          <div style={s.promoDesc}>{promo.promotion_description}</div>
                        )}
                        <div style={s.promoMeta}>
                          <span style={{ ...s.typePill, background: color + '18', color, borderColor: color + '44' }}>
                            {promo.promotion_type}
                          </span>
                          {promo.discount_percent != null && (
                            <span style={s.metaChip}>{promo.discount_percent}% off</span>
                          )}
                          <span style={s.metaChip}>
                            {formatDate(promo.start_date)} → {formatDate(promo.end_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {!loading && !error && (
          <div style={s.pagination}>
            <button
              style={{ ...s.pageBtn, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <div style={s.pageNumbers}>
              {pageNumbers.map(n => (
                <button
                  key={n}
                  style={{
                    ...s.pageNumBtn,
                    background: n === page ? 'var(--accent)' : 'transparent',
                    color: n === page ? '#080c10' : 'var(--text-secondary)',
                    fontWeight: n === page ? 700 : 500,
                  }}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              style={{ ...s.pageBtn, opacity: page >= maxPage ? 0.4 : 1, cursor: page >= maxPage ? 'not-allowed' : 'pointer' }}
              disabled={page >= maxPage}
              onClick={() => setPage(p => Math.min(maxPage, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Selection popup */}
      {popupPromotion && (
        <div style={s.overlay} onClick={() => !analysing && setPopupPromotion(null)}>
          <div style={s.popup} onClick={(e) => e.stopPropagation()}>
            <div style={s.popupHeader}>
              <span style={{
                ...s.typePill,
                background: (typeColor[popupPromotion.promotion_type] ?? typeColor.default) + '18',
                color: typeColor[popupPromotion.promotion_type] ?? typeColor.default,
                borderColor: (typeColor[popupPromotion.promotion_type] ?? typeColor.default) + '44',
              }}>
                {popupPromotion.promotion_type}
              </span>
            </div>
            <h3 style={s.popupTitle}>{popupPromotion.promotion_name}</h3>
            {popupPromotion.promotion_description && (
              <p style={s.popupDesc}>{popupPromotion.promotion_description}</p>
            )}
            <div style={s.popupMeta}>
              {popupPromotion.discount_percent != null && (
                <span style={s.metaChip}>{popupPromotion.discount_percent}% off</span>
              )}
              <span style={s.metaChip}>
                {formatDate(popupPromotion.start_date)} → {formatDate(popupPromotion.end_date)}
              </span>
            </div>

            {analyseError && <div style={s.popupError}>{analyseError}</div>}

            <div style={s.popupActions}>
              <button style={s.cancelBtn} disabled={analysing} onClick={() => setPopupPromotion(null)}>
                Cancel
              </button>
              <button style={{ ...s.analyseBtn, opacity: analysing ? 0.7 : 1 }} disabled={analysing} onClick={handleAnalyse}>
                {analysing ? (
                  <>
                    <span style={s.btnSpinner} />
                    Starting…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
                    </svg>
                    Analyze
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--text-muted); }
        input:focus { border-color: var(--border-accent) !important; }
      `}</style>
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
    padding: '20px 24px 40px', position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  pageHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '7px',
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '7px 14px',
    color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  headerMeta: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoMark: {
    width: '28px', height: '28px',
    background: 'var(--accent-dim)', border: '1px solid rgba(0,200,160,0.2)',
    borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandSmall: {
    fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  titleBlock: { display: 'flex', flexDirection: 'column', gap: '6px' },
  pageTitle: {
    fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.02em',
  },
  pageSub: { fontSize: '14px', color: 'var(--text-secondary)' },
  searchWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute', left: '13px', color: 'var(--text-muted)', pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '10px 14px 10px 38px',
    color: 'var(--text-primary)', fontSize: '14px',
    transition: 'border-color 0.2s',
  },
  listPanel: {
    height: '480px', overflowY: 'auto',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface)', padding: '12px',
  },
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
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    textAlign: 'center', padding: '60px 0',
    color: 'var(--danger)', fontSize: '14px',
  },
  retryBtn: {
    background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)', padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center', padding: '60px 0',
    color: 'var(--text-muted)', fontSize: '14px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  promoCard: {
    width: '100%', padding: '18px 20px',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s', display: 'flex',
  },
  promoCardLeft: { display: 'flex', gap: '14px', width: '100%' },
  promoInfo: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 },
  promoName: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' },
  promoDesc: { fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 },
  promoMeta: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '2px' },
  typePill: {
    fontSize: '11px', fontWeight: 600, padding: '2px 8px',
    borderRadius: '20px', border: '1px solid',
  },
  metaChip: {
    fontSize: '11px', color: 'var(--text-muted)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 8px',
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    flexWrap: 'wrap' as const,
  },
  pageBtn: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '7px 14px',
    color: 'var(--text-secondary)', fontSize: '13px',
  },
  pageNumbers: { display: 'flex', gap: '4px', flexWrap: 'wrap' as const, justifyContent: 'center' },
  pageNumBtn: {
    width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', fontSize: '12px', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: '24px',
  },
  popup: {
    width: '100%', maxWidth: '440px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '28px',
    display: 'flex', flexDirection: 'column', gap: '10px',
    boxShadow: 'var(--shadow-elevated)',
  },
  popupHeader: { display: 'flex' },
  popupTitle: {
    fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700,
    color: 'var(--text-primary)',
  },
  popupDesc: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 },
  popupMeta: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '4px' },
  popupError: {
    fontSize: '12.5px', color: 'var(--danger)', background: 'var(--danger-dim)',
    border: '1px solid rgba(255,71,87,0.25)', borderRadius: 'var(--radius-sm)', padding: '8px 10px',
  },
  popupActions: { display: 'flex', gap: '10px', marginTop: '14px' },
  cancelBtn: {
    flex: 1, background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '11px', color: 'var(--text-secondary)',
    fontSize: '14px', cursor: 'pointer',
  },
  analyseBtn: {
    flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: 'var(--accent)', color: '#080c10',
    fontWeight: 700, fontSize: '14px',
    padding: '11px', borderRadius: 'var(--radius-sm)',
    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
  },
  btnSpinner: {
    width: '14px', height: '14px',
    border: '2px solid rgba(8,12,16,0.3)', borderTopColor: '#080c10',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
  },
};
