import React from 'react';

export default function Lobby({ walletAddress, tokens, pokerChips, canClaim, countdown, onClaim, onPaidRefill, loading, status, onSelect, onConnect, onDisconnect }) {
  const S = {
    lobby: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px', gap: '2rem', zIndex: 1, position: 'relative' },
    balanceBar: { background: 'rgba(10,0,25,0.85)', border: '1px solid rgba(180,0,255,0.3)', borderRadius: '12px', padding: '0.75rem 1.5rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', boxShadow: '0 0 20px rgba(180,0,255,0.1)' },
    walletText: { color: '#00ff88', fontSize: '0.7rem', letterSpacing: '2px', fontFamily: "'Courier New', monospace" },
    tokenText: { color: '#ffee00', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: '0 0 8px #ffee00' },
    pokerText: { color: '#aa44ff', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: '0 0 8px #aa44ff' },
    btnRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    smallBtn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.03)' : 'transparent', border: `1px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: disabled ? 'default' : 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }),
    cards: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
    gameCard: (color) => ({ background: 'rgba(10,0,25,0.85)', border: `2px solid ${color}`, borderRadius: '16px', padding: '2.5rem 2rem', width: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', boxShadow: `0 0 30px ${color}44, inset 0 0 30px rgba(10,0,25,0.5)`, transition: 'all 0.2s' }),
    gameCardDisabled: { background: 'rgba(10,0,25,0.85)', border: '2px solid #333', borderRadius: '16px', padding: '2.5rem 2rem', width: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'default', position: 'relative', overflow: 'hidden' },
    gameIcon: { fontSize: '4rem', lineHeight: 1 },
    gameTitle: (color) => ({ color, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', textShadow: `0 0 10px ${color}, 0 0 30px ${color}`, fontFamily: "'Courier New', monospace", textAlign: 'center' }),
    gameDesc: { color: '#666', fontSize: '0.72rem', letterSpacing: '2px', textAlign: 'center', lineHeight: '1.7', fontFamily: "'Courier New', monospace" },
    playBtn: (color) => ({ background: 'transparent', border: `2px solid ${color}`, color, borderRadius: '6px', padding: '0.6rem 2rem', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '4px', cursor: 'pointer', textShadow: `0 0 10px ${color}`, boxShadow: `0 0 15px ${color}33`, fontFamily: "'Courier New', monospace", marginTop: '0.5rem' }),
    playBtnDisabled: { background: 'transparent', border: '2px solid #333', color: '#333', borderRadius: '6px', padding: '0.6rem 2rem', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '4px', cursor: 'default', fontFamily: "'Courier New', monospace", marginTop: '0.5rem' },
    comingSoon: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-25deg)', color: '#00ff88', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '4px', fontFamily: "'Courier New', monospace", border: '3px solid #00ff88', padding: '0.3rem 0.75rem', borderRadius: '6px', opacity: 0.6, textShadow: '0 0 10px #00ff88', boxShadow: '0 0 15px #00ff8844', whiteSpace: 'nowrap', pointerEvents: 'none' },
    footer: { color: '#333', fontSize: '0.65rem', letterSpacing: '4px', textTransform: 'uppercase', fontFamily: "'Courier New', monospace", textAlign: 'center' },
  };

  const handleSwitchAccount = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      onConnect();
    } catch (err) {
      console.error('Switch account failed:', err);
    }
  };

  return (
    <div style={S.lobby}>
      {/* Balance bar */}
      <div style={S.balanceBar}>
        {walletAddress ? (
          <span style={S.walletText}>✅ {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</span>
        ) : (
          <span style={{ ...S.walletText, color: '#444' }}>👤 GUEST</span>
        )}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={S.tokenText}>🪙 {tokens} TOKENS</span>
          {walletAddress && <span style={S.pokerText}>🟣 {pokerChips} CHIPS</span>}
        </div>
        <div style={S.btnRow}>
          {canClaim ? (
            <button onClick={onClaim} style={S.smallBtn('#00ff88', false)}>🎁 FREE 30</button>
          ) : (
            <span style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '1px', fontFamily: "'Courier New', monospace", alignSelf: 'center' }}>Free in {countdown}</span>
          )}
          <button onClick={onPaidRefill} disabled={loading} style={S.smallBtn('#ffee00', loading)}>
            {loading ? '...' : '50 TOKENS — 30 LCAI'}
          </button>
          {walletAddress ? (
            <>
              <button onClick={handleSwitchAccount} style={S.smallBtn('#00aaff', false)}>🔄 SWITCH</button>
              <button onClick={onDisconnect} style={S.smallBtn('#ff4400', false)}>⏏ DISCONNECT</button>
            </>
          ) : (
            <button onClick={onConnect} style={S.smallBtn('#444', false)}>🔗 CONNECT</button>
          )}
        </div>
      </div>

      {status && (
        <div style={{ color: '#00ff88', fontSize: '0.75rem', letterSpacing: '2px', textShadow: '0 0 6px #00ff88', fontFamily: "'Courier New', monospace" }}>⚡ {status}</div>
      )}

      {/* Game cards */}
      <div style={S.cards}>

        {/* Blackjack */}
        <div style={S.gameCard('#00ff88')} onClick={() => onSelect('blackjack')}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={S.gameIcon}>🃏</div>
          <div style={S.gameTitle('#00ff88')}>Blackjack</div>
          <div style={S.gameDesc}>Classic 21 · Split · Double Down<br />Bets from 1 Token</div>
          <button style={S.playBtn('#00ff88')}>▶ PLAY</button>
        </div>

        {/* Slots */}
        <div style={S.gameCard('#ff6600')} onClick={() => onSelect('slots')}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={S.gameIcon}>🎰</div>
          <div style={S.gameTitle('#ff6600')}>Slots</div>
          <div style={S.gameDesc}>5 Reels · 8 Symbols · 93.69% RTP<br />Bets from 1 Token</div>
          <button style={S.playBtn('#ff6600')}>▶ PLAY</button>
        </div>

        {/* Texas Hold'em Normal */}
        <div style={S.gameCard('#00aaff')} onClick={() => onSelect('poker')}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={S.gameIcon}>🎴</div>
          <div style={S.gameTitle('#00aaff')}>Texas Hold'em</div>
          <div style={S.gameDesc}>Normal Table · Token Bets<br />Rule-Based Dealer</div>
          <button style={S.playBtn('#00aaff')}>▶ PLAY</button>
        </div>

        {/* Leaderboard — LIVE */}
        <div style={S.gameCard('#ffaa00')} onClick={() => onSelect('leaderboard')}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={S.gameIcon}>🏆</div>
          <div style={S.gameTitle('#ffaa00')}>Leaderboard</div>
          <div style={S.gameDesc}>Top Players · All Games<br />Biggest Stacks</div>
          <button style={S.playBtn('#ffaa00')}>▶ VIEW</button>
        </div>

        {/* Texas Hold'em Pro — Coming Soon */}
        <div style={{ ...S.gameCardDisabled, border: '2px solid #1a0a2a' }}>
          <div style={{ ...S.gameIcon, filter: 'grayscale(1)', opacity: 0.3 }}>👑</div>
          <div style={{ ...S.gameTitle('#444'), textShadow: 'none' }}>Pro Table</div>
          <div style={{ ...S.gameDesc, color: '#333' }}>30 LCAI Buy-In · 100 Chips<br />AI Opponent</div>
          <button style={S.playBtnDisabled} disabled>▶ PLAY</button>
          <div style={{ ...S.comingSoon, color: '#aa44ff', borderColor: '#aa44ff', textShadow: '0 0 10px #aa44ff', boxShadow: '0 0 15px #aa44ff44' }}>COMING SOON</div>
        </div>

        {/* Roulette — Coming Soon */}
        <div style={S.gameCardDisabled}>
          <div style={{ ...S.gameIcon, filter: 'grayscale(1)', opacity: 0.3 }}>🎡</div>
          <div style={{ ...S.gameTitle('#444'), textShadow: 'none' }}>Roulette</div>
          <div style={{ ...S.gameDesc, color: '#333' }}>European · Full Bet Types<br />Bets from 1 Token</div>
          <button style={S.playBtnDisabled} disabled>▶ PLAY</button>
          <div style={S.comingSoon}>COMING SOON</div>
        </div>

      </div>

      <div>
        <div style={{ ...S.footer, color: '#444', marginBottom: '0.25rem' }}>⚠ Play Responsibly</div>
        <div style={S.footer}>FrankenApps · Built on LightChain AI</div>
        <div style={{ ...S.footer, marginTop: '0.25rem' }}>
          <a href="mailto:frankenlabsadmin@gmail.com" style={{ color: '#333', textDecoration: 'none' }}>frankenlabsadmin@gmail.com</a>
        </div>
      </div>
    </div>
  );
}