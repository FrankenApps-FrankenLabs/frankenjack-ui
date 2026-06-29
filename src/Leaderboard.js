import React, { useState, useEffect } from 'react';

const BACKEND_URL = 'https://frankenapps-frankenlabs-frankenjack.onrender.com';

export default function Leaderboard({ onBack }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('chips');

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => { setLeaders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = (key) => [...leaders].sort((a, b) => (b[key] || 0) - (a[key] || 0));

  const tabs = [
    { id: 'chips', label: '🟣 CHIP STACK', key: 'biggest_chip_stack', color: '#aa44ff' },
    { id: 'poker', label: '🎴 POKER WINS', key: 'poker_wins', color: '#00aaff' },
    { id: 'blackjack', label: '🃏 BLACKJACK', key: 'blackjack_wins', color: '#00ff88' },
    { id: 'slots', label: '🎰 SLOTS', key: 'slots_wins', color: '#ff6600' },
    { id: 'hands', label: '🎯 TOTAL HANDS', key: 'total_hands', color: '#ffaa00' },
  ];

  const activeTab = tabs.find(t => t.id === tab);
  const data = sorted(activeTab.key);

  const S = {
    section: { background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(0,255,100,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '680px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,100,0.1)' },
    sectionLabel: { color: '#00ff88', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ff88', marginBottom: '0.75rem' },
    tabBtn: (active, color) => ({ background: active ? `rgba(${hexToRgb(color)},0.15)` : 'transparent', border: `1px solid ${active ? color : '#333'}`, color: active ? color : '#444', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }),
    row: (i) => ({ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid #0d1a0d', opacity: i > 2 ? 0.8 : 1 }),
    rank: (i) => ({ color: i === 0 ? '#ffd700' : i === 1 ? '#aaaaaa' : i === 2 ? '#cc6600' : '#444', fontSize: i < 3 ? '1.2rem' : '0.8rem', fontWeight: 900, width: '28px', textAlign: 'center', fontFamily: "'Courier New', monospace" }),
    wallet: { color: '#666', fontSize: '0.7rem', letterSpacing: '1px', fontFamily: "'Courier New', monospace", flex: 1 },
    value: (color) => ({ color, fontSize: '0.9rem', fontWeight: 900, letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: `0 0 8px ${color}` }),
  };

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  const rankIcon = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: '680px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #444', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '3px', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }}>← LOBBY</button>
        <div style={{ flex: 1, background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(0,255,100,0.3)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
          <span style={{ color: '#00ff88', fontSize: '0.7rem', letterSpacing: '4px', fontFamily: "'Courier New', monospace" }}>🏆 LEADERBOARD</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={S.tabBtn(tab === t.id, t.color)}>{t.label}</button>
        ))}
      </div>

      {/* Table */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ {activeTab.label} — Top 10</div>

        {loading ? (
          <div style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '3px', textAlign: 'center', padding: '2rem', fontFamily: "'Courier New', monospace" }}>⚡ LOADING...</div>
        ) : data.length === 0 || data.every(d => !d[activeTab.key]) ? (
          <div style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '3px', textAlign: 'center', padding: '2rem', fontFamily: "'Courier New', monospace" }}>NO DATA YET — BE THE FIRST!</div>
        ) : (
          data.filter(d => d[activeTab.key] > 0).slice(0, 10).map((entry, i) => (
            <div key={entry.wallet} style={S.row(i)}>
              <div style={S.rank(i)}>{rankIcon(i)}</div>
              <div style={S.wallet}>{entry.wallet.slice(0,6)}...{entry.wallet.slice(-4)}</div>
              <div style={S.value(activeTab.color)}>{entry[activeTab.key].toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}