import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, parseEther } from 'ethers';
import Lobby from './Lobby';
import Blackjack from './Blackjack';
import Slots from './Slots';
import Poker from './Poker';

const RECEIVING_WALLET = '0x11cEF17C7581Df308179919e80Be5Dbb6B1CcC4B';
const BACKEND_URL = 'https://frankenapps-frankenlabs-frankenjack.onrender.com';
const LCAI_CHAIN = {
  chainId: '0x23F0',
  chainName: 'LightChain AI',
  rpcUrls: ['https://rpc.mainnet.lightchain.ai'],
  nativeCurrency: { name: 'LCAI', symbol: 'LCAI', decimals: 18 },
};

const FREE_TOKENS = 30;
const PAID_TOKENS = 50;
const PAID_COST = '30';
const GUEST_KEY = 'fj_guest_tokens';
const GUEST_CLAIM_KEY = 'fj_guest_lastclaim';

function canFreeClaim(key) {
  const last = localStorage.getItem(key);
  if (!last) return true;
  return Date.now() - parseInt(last) >= 24 * 60 * 60 * 1000;
}

function saveLastClaim(key) {
  localStorage.setItem(key, Date.now().toString());
}

function freeClaimCountdown(key) {
  const last = localStorage.getItem(key);
  if (!last) return null;
  const remaining = 24 * 60 * 60 * 1000 - (Date.now() - parseInt(last));
  if (remaining <= 0) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m`;
}

const NeonPanel = ({ flip }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0.5rem' }}>
    <div style={{ width: '8px', height: '80px', background: 'linear-gradient(180deg, #00ff88, #00cc66)', borderRadius: '4px', animation: 'neonGreen1 1.8s ease-in-out infinite' }} />
    <div style={{ width: '22px', height: '22px', background: '#ff6600', transform: 'rotate(45deg)', borderRadius: '3px', animation: 'neonOrange1 1.2s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#00ff88', animation: flip ? 'neonGreen2 2.3s ease-in-out infinite' : 'neonGreen1 2.3s ease-in-out infinite', textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88' }}>♠</div>
    <div style={{ width: '8px', height: '60px', background: 'linear-gradient(180deg, #ff6600, #ffaa00)', borderRadius: '4px', animation: 'neonOrange2 2s ease-in-out infinite' }} />
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '4px solid #00ff88', animation: 'neonGreen1 1.5s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#ff6600', animation: flip ? 'neonOrange1 1.7s ease-in-out infinite' : 'neonOrange2 1.7s ease-in-out infinite', textShadow: '0 0 10px #ff6600, 0 0 20px #ff6600' }}>♥</div>
    <div style={{ width: '8px', height: '70px', background: 'linear-gradient(180deg, #00ff88, #00cc66, #00ff88)', borderRadius: '4px', animation: 'neonGreen2 1.9s ease-in-out infinite' }} />
    <div style={{ width: '22px', height: '22px', background: '#00ff88', transform: 'rotate(45deg)', borderRadius: '2px', animation: 'neonGreen1 1.4s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#ffaa00', animation: 'neonFlicker 3s ease-in-out infinite', textShadow: '0 0 10px #ffaa00, 0 0 20px #ffaa00' }}>♦</div>
    <div style={{ width: '8px', height: '90px', background: 'linear-gradient(180deg, #ff6600, #ffaa00, #ff6600)', borderRadius: '4px', animation: 'neonOrange1 2.5s ease-in-out infinite' }} />
    <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '22px solid #00ff88', filter: 'drop-shadow(0 0 6px #00ff88)', animation: 'neonGreen2 1.4s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#00ff88', animation: flip ? 'neonGreen1 2s ease-in-out infinite' : 'neonGreen2 2s ease-in-out infinite', textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88' }}>♣</div>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '4px solid #ff6600', animation: 'neonOrange2 1.8s ease-in-out infinite' }} />
    <div style={{ width: '8px', height: '80px', background: 'linear-gradient(180deg, #00cc66, #00ff88)', borderRadius: '4px', animation: 'neonGreen1 2.2s ease-in-out infinite' }} />
    <div style={{ width: '8px', height: '60px', background: 'linear-gradient(180deg, #ffaa00, #ff6600)', borderRadius: '4px', animation: 'neonOrange1 1.6s ease-in-out infinite' }} />
  </div>
);

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem(GUEST_KEY);
    if (saved !== null) return parseInt(saved);
    if (canFreeClaim(GUEST_CLAIM_KEY)) {
      localStorage.setItem(GUEST_KEY, FREE_TOKENS.toString());
      saveLastClaim(GUEST_CLAIM_KEY);
      return FREE_TOKENS;
    }
    return 0;
  });
  const [pokerChips, setPokerChips] = useState(0);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mobile, setMobile] = useState(window.innerWidth < 900);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ageCheck, setAgeCheck] = useState(false);
  const [entertainmentCheck, setEntertainmentCheck] = useState(false);

  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      localStorage.setItem(GUEST_KEY, tokens.toString());
    }
  }, [tokens, walletAddress]);

  const syncBalanceToBackend = useCallback(async (wallet, newTokens, newPokerChips) => {
    try {
      await fetch(`${BACKEND_URL}/api/players/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, tokens: newTokens, poker_chips: newPokerChips })
      });
    } catch (err) {
      console.error('Failed to sync balance:', err);
    }
  }, []);

  const updateTokens = useCallback(async (val) => {
    const newVal = typeof val === 'function' ? val(tokens) : val;
    setTokens(newVal);
    if (walletAddress) {
      await syncBalanceToBackend(walletAddress, newVal, pokerChips);
    } else {
      localStorage.setItem(GUEST_KEY, newVal.toString());
    }
  }, [tokens, pokerChips, walletAddress, syncBalanceToBackend]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x23F0' }] });
      } catch (switchError) {
        if (switchError.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [LCAI_CHAIN] });
      }
      const wallet = accounts[0];
      setWalletAddress(wallet);
      const res = await fetch(`${BACKEND_URL}/api/players/${wallet}`);
      const player = await res.json();
      setTokens(player.tokens);
      setPokerChips(player.poker_chips);
      localStorage.removeItem(GUEST_KEY);
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  const doFreeClaim = async () => {
    const newTotal = tokens + FREE_TOKENS;
    saveLastClaim(GUEST_CLAIM_KEY);
    if (walletAddress) {
      await syncBalanceToBackend(walletAddress, newTotal, pokerChips);
    } else {
      localStorage.setItem(GUEST_KEY, newTotal.toString());
    }
    setTokens(newTotal);
    setStatus('30 free tokens added!');
    setTimeout(() => setStatus(''), 2000);
  };

  const doPaidRefill = async () => {
    setLoading(true);
    setStatus('Confirm payment in MetaMask...');
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const prov = new BrowserProvider(window.ethereum);
      const signer = await prov.getSigner();
      const tx = await signer.sendTransaction({ to: RECEIVING_WALLET, value: parseEther(PAID_COST) });
      setStatus('Processing...');
      await tx.wait();
      if (walletAddress) {
        const res = await fetch(`${BACKEND_URL}/api/payments/refill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: walletAddress, tx_hash: tx.hash })
        });
        const data = await res.json();
        if (data.tokens !== undefined) setTokens(data.tokens);
      } else {
        const newTotal = tokens + PAID_TOKENS;
        localStorage.setItem(GUEST_KEY, newTotal.toString());
        setTokens(newTotal);
      }
      setStatus('50 tokens added!');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setStatus('Error: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  const canClaim = canFreeClaim(GUEST_CLAIM_KEY);
  const countdown = freeClaimCountdown(GUEST_CLAIM_KEY);
  const bothChecked = ageCheck && entertainmentCheck;

  const S = {
    app: { minHeight: '100vh', background: '#030d05', color: '#e0ffe8', fontFamily: "'Courier New', monospace", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' },
    scanlines: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)', pointerEvents: 'none', zIndex: 999 },
    grid: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(0,255,100,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
    section: { background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(0,255,100,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,100,0.1)' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33`, transition: 'all 0.2s', flex: 1, minWidth: '100px', fontFamily: "'Courier New', monospace" }),
    checkRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' },
    checkbox: (checked) => ({ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px', border: `2px solid ${checked ? '#00ff88' : '#444'}`, borderRadius: '4px', background: checked ? 'rgba(0,255,136,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: checked ? '0 0 10px #00ff8855' : 'none' }),
  };

  const mainContent = (
    <>
      {!acknowledged ? (
        <div style={S.section}>
          <div style={{ color: '#00ff88', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ff88', marginBottom: '0.5rem' }}>◈ Before You Play</div>
          <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '1.5rem', lineHeight: '1.8' }}>Please confirm the following before playing.</div>
          <div style={S.checkRow} onClick={() => setAgeCheck(!ageCheck)}>
            <div style={S.checkbox(ageCheck)}>{ageCheck && <span style={{ color: '#00ff88', fontSize: '0.8rem', fontWeight: 900 }}>✓</span>}</div>
            <div style={{ color: ageCheck ? '#e0ffe8' : '#666', fontSize: '0.82rem', letterSpacing: '1px', lineHeight: '1.6', transition: 'color 0.2s' }}>
              I confirm that I am <span style={{ color: '#ffd700', fontWeight: 900 }}>18 years of age or older</span> and that online gambling is legal in my jurisdiction.
            </div>
          </div>
          <div style={S.checkRow} onClick={() => setEntertainmentCheck(!entertainmentCheck)}>
            <div style={S.checkbox(entertainmentCheck)}>{entertainmentCheck && <span style={{ color: '#00ff88', fontSize: '0.8rem', fontWeight: 900 }}>✓</span>}</div>
            <div style={{ color: entertainmentCheck ? '#e0ffe8' : '#666', fontSize: '0.82rem', letterSpacing: '1px', lineHeight: '1.6', transition: 'color 0.2s' }}>
              I understand that FrankenJack is a <span style={{ color: '#ffd700', fontWeight: 900 }}>decentralised application for entertainment purposes only</span>. Play responsibly.
            </div>
          </div>
          <button onClick={() => bothChecked && setAcknowledged(true)} style={S.btn('#00ff88', !bothChecked)}>
            {bothChecked ? '⚡ ENTER FRANKENJACK' : '🔒 TICK BOTH TO CONTINUE'}
          </button>
        </div>
      ) : game === 'blackjack' ? (
        <Blackjack tokens={tokens} setTokens={updateTokens} onBack={() => setGame(null)} />
      ) : game === 'slots' ? (
        <Slots tokens={tokens} setTokens={updateTokens} onBack={() => setGame(null)} />
      ) : game === 'poker' ? (
        <Poker tokens={tokens} setTokens={updateTokens} onBack={() => setGame(null)} />
      ) : (
        <Lobby
          walletAddress={walletAddress}
          tokens={tokens}
          pokerChips={pokerChips}
          canClaim={canClaim}
          countdown={countdown}
          onClaim={doFreeClaim}
          onPaidRefill={doPaidRefill}
          loading={loading}
          status={status}
          onSelect={g => setGame(g)}
          onConnect={connectWallet}
        />
      )}
    </>
  );

  return (
    <div style={S.app}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.85} }
        @keyframes glitch { 0%{transform:translate(2px,0) skew(1deg)} 25%{transform:translate(-2px,0) skew(-1deg)} 50%{transform:translate(0,2px)} 75%{transform:translate(0,-2px) skew(0.5deg)} 100%{transform:translate(2px,0)} }
        @keyframes scanMove { 0%{top:0} 100%{top:100%} }
        @keyframes neonGreen1 { 0%,100%{opacity:1;box-shadow:0 0 8px #00ff88,0 0 20px #00ff88,0 0 40px #00ff88} 50%{opacity:0.4;box-shadow:0 0 4px #00ff88,0 0 8px #00ff88} }
        @keyframes neonGreen2 { 0%,100%{opacity:0.4;box-shadow:0 0 4px #00cc66,0 0 8px #00cc66} 50%{opacity:1;box-shadow:0 0 8px #00cc66,0 0 20px #00cc66,0 0 40px #00cc66} }
        @keyframes neonOrange1 { 0%,100%{opacity:1;box-shadow:0 0 8px #ff6600,0 0 20px #ff6600,0 0 40px #ff6600} 50%{opacity:0.3;box-shadow:0 0 4px #ff6600} }
        @keyframes neonOrange2 { 0%,100%{opacity:0.3;box-shadow:0 0 4px #ffaa00} 50%{opacity:1;box-shadow:0 0 8px #ffaa00,0 0 20px #ffaa00,0 0 40px #ffaa00} }
        @keyframes neonFlicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.2} 94%{opacity:1} 97%{opacity:0.4} 98%{opacity:1} }
        button:hover:not(:disabled) { filter: brightness(1.3); transform: scale(1.03); }
      `}</style>
      <div style={S.scanlines} />
      <div style={S.grid} />
      <div style={{ position: 'fixed', left: 0, right: 0, height: '2px', background: 'rgba(0,255,100,0.15)', animation: 'scanMove 4s linear infinite', pointerEvents: 'none', zIndex: 998 }} />

      <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '8px', textTransform: 'uppercase', color: '#00ff88', margin: 0, textShadow: '0 0 10px #00ff88, 0 0 30px #00ff88, 0 0 60px #00cc66', animation: 'pulse 2s infinite' }}>FrankenJack</h1>
        <div style={{ color: '#ff6600', letterSpacing: '6px', fontSize: '0.75rem', textShadow: '0 0 10px #ff6600', marginTop: '0.25rem' }}>◈ BLACKJACK · SLOTS · LIGHTCHAIN AI ◈</div>
      </div>

      {mobile ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{mainContent}</div>
      ) : (
        <div style={{ display: 'flex', width: '100%', maxWidth: '1200px', gap: '0.5rem', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ width: '80px', flexShrink: 0, position: 'sticky', top: '1rem' }}><NeonPanel flip={false} /></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>{mainContent}</div>
          <div style={{ width: '80px', flexShrink: 0, position: 'sticky', top: '1rem' }}><NeonPanel flip={true} /></div>
        </div>
      )}

      <div style={{ color: '#111', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', marginTop: 'auto', paddingTop: '2rem', zIndex: 1, textAlign: 'center' }}>
        FrankenApps · Built on LightChain AI<br />
        <a href="mailto:frankenlabsadmin@gmail.com" style={{ color: '#111', textDecoration: 'none' }}>frankenlabsadmin@gmail.com</a>
      </div>
    </div>
  );
}