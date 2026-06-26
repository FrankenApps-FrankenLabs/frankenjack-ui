import React, { useState, useEffect } from 'react';
import { BrowserProvider, parseEther } from 'ethers';

const RECEIVING_WALLET = '0x7FE522ab4F456cFc41FE7a7a0C94F28801CCA8fc';
const STARTING_CHIPS = 15;
const REFILL_CHIPS = 15;
const REFILL_COST = '1';
const FREE_REFILL_HOURS = 24;
const LCAI_CHAIN = {
  chainId: '0x23F0',
  chainName: 'LightChain AI',
  rpcUrls: ['https://rpc.mainnet.lightchain.ai'],
  nativeCurrency: { name: 'LCAI', symbol: 'LCAI', decimals: 18 },
};

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ suit, value, isRed: suit === '♥' || suit === '♦' });
  return shuffle(deck);
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

function handTotal(cards) {
  let total = 0; let aces = 0;
  for (const card of cards) {
    if (card.value === 'A') aces++;
    total += cardValue(card);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function getResultObj(pCards, dCards, betAmount) {
  const pTotal = handTotal(pCards); const dTotal = handTotal(dCards);
  const playerBJ = pTotal === 21 && pCards.length === 2;
  const dealerBJ = dTotal === 21 && dCards.length === 2;
  let payout = 0; let label, color, sub;
  if (playerBJ && dealerBJ) { label = '🔄 PUSH'; color = '#ffaa00'; sub = 'Bet returned'; payout = betAmount; }
  else if (playerBJ) { payout = betAmount + Math.floor(betAmount * 1.5); label = '🃏 BLACKJACK!'; color = '#00ff88'; sub = `+${Math.floor(betAmount * 1.5)} chips`; }
  else if (pTotal > 21) { label = '💀 BUST'; color = '#ff4400'; sub = `Lost ${betAmount} chips`; payout = 0; }
  else if (dTotal > 21) { payout = betAmount * 2; label = '⚡ DEALER BUSTS!'; color = '#00ff88'; sub = `+${betAmount} chips`; }
  else if (pTotal > dTotal) { payout = betAmount * 2; label = '⚡ YOU WIN!'; color = '#00ff88'; sub = `+${betAmount} chips`; }
  else if (pTotal === dTotal) { label = '🔄 PUSH'; color = '#ffaa00'; sub = 'Bet returned'; payout = betAmount; }
  else { label = '💀 YOU LOSE'; color = '#ff4400'; sub = `Lost ${betAmount} chips`; payout = 0; }
  return { label, color, sub, payout };
}

const GAME_STATE = { IDLE: 'idle', PLAYING: 'playing', SPLIT_PLAYING: 'split_playing', FINISHED: 'finished' };

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
  const [chips, setChips] = useState(() => {
    const saved = localStorage.getItem('fj_chips');
    return saved ? parseInt(saved) : STARTING_CHIPS;
  });
  const [lastFreeRefill, setLastFreeRefill] = useState(() => {
    return localStorage.getItem('fj_last_free_refill') || null;
  });
  const [screen, setScreen] = useState('game');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth < 900);
  const [walletAddress, setWalletAddress] = useState(null);

  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [deck, setDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [splitCards, setSplitCards] = useState(null);
  const [activeHand, setActiveHand] = useState(0);
  const [bet, setBet] = useState(1);
  const [currentBet, setCurrentBet] = useState(0);
  const [results, setResults] = useState(null);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    localStorage.setItem('fj_chips', chips.toString());
  }, [chips]);

  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (results) { setGlitch(true); setTimeout(() => setGlitch(false), 600); }
  }, [results]);

  const canFreeRefill = () => {
    if (!lastFreeRefill) return true;
    const diff = Date.now() - parseInt(lastFreeRefill);
    return diff >= FREE_REFILL_HOURS * 60 * 60 * 1000;
  };

  const freeRefillCountdown = () => {
    if (!lastFreeRefill) return null;
    const diff = Date.now() - parseInt(lastFreeRefill);
    const remaining = FREE_REFILL_HOURS * 60 * 60 * 1000 - diff;
    if (remaining <= 0) return null;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const doFreeRefill = () => {
    const now = Date.now().toString();
    setChips(prev => prev + REFILL_CHIPS);
    setLastFreeRefill(now);
    localStorage.setItem('fj_last_free_refill', now);
    setStatus('15 free chips added!');
    setTimeout(() => setStatus(''), 2000);
  };

  const connectAndPay = async () => {
    setLoading(true);
    setStatus('Connecting wallet...');
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x23F0' }] });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [LCAI_CHAIN] });
        }
      }
      const prov = new BrowserProvider(window.ethereum);
      const signer = await prov.getSigner();
      setWalletAddress(accounts[0]);
      setStatus('Confirm payment in MetaMask...');
      const tx = await signer.sendTransaction({ to: RECEIVING_WALLET, value: parseEther(REFILL_COST) });
      setStatus('Processing...');
      await tx.wait();
      setChips(prev => prev + REFILL_CHIPS);
      setStatus('15 chips added!');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setStatus('Error: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  const dealGame = () => {
    if (chips < bet) { setStatus('Not enough chips!'); return; }
    setResults(null); setStatus(''); setSplitCards(null); setActiveHand(0);
    const newDeck = createDeck();
    const p = [newDeck[0], newDeck[2]]; const d = [newDeck[1], newDeck[3]];
    const remaining = newDeck.slice(4);
    setDeck(remaining); setPlayerCards(p); setDealerCards(d);
    setCurrentBet(bet); setGameState(GAME_STATE.PLAYING);
    setChips(prev => prev - bet);
    if (handTotal(p) === 21) finishHands(p, null, d, remaining, bet, bet);
  };

  const doHit = () => {
    const newCard = deck[0]; const remaining = deck.slice(1); setDeck(remaining);
    if (activeHand === 0) {
      const newHand = [...playerCards, newCard]; setPlayerCards(newHand);
      if (handTotal(newHand) >= 21) {
        if (splitCards !== null) { setActiveHand(1); setGameState(GAME_STATE.SPLIT_PLAYING); }
        else finishHands(newHand, null, dealerCards, remaining, currentBet, currentBet);
      }
    } else {
      const newSplit = [...splitCards, newCard]; setSplitCards(newSplit);
      if (handTotal(newSplit) >= 21) finishHands(playerCards, newSplit, dealerCards, remaining, currentBet, currentBet);
    }
  };

  const doStand = () => {
    if (activeHand === 0 && splitCards !== null) { setActiveHand(1); setGameState(GAME_STATE.SPLIT_PLAYING); }
    else finishHands(playerCards, splitCards, dealerCards, deck, currentBet, currentBet);
  };

  const doDoubleDown = () => {
    if (chips < currentBet) { setStatus('Not enough chips to double.'); return; }
    setChips(prev => prev - currentBet);
    const newCard = deck[0]; const remaining = deck.slice(1); setDeck(remaining);
    const newBet = currentBet * 2; setCurrentBet(newBet);
    if (activeHand === 0) {
      const newHand = [...playerCards, newCard]; setPlayerCards(newHand);
      if (splitCards !== null) { setActiveHand(1); setGameState(GAME_STATE.SPLIT_PLAYING); }
      else finishHands(newHand, null, dealerCards, remaining, newBet, newBet);
    } else {
      const newSplit = [...splitCards, newCard]; setSplitCards(newSplit);
      finishHands(playerCards, newSplit, dealerCards, remaining, currentBet, newBet);
    }
  };

  const doSplit = () => {
    if (chips < currentBet) { setStatus('Not enough chips to split.'); return; }
    setChips(prev => prev - currentBet);
    const newCard1 = deck[0]; const newCard2 = deck[1]; const remaining = deck.slice(2);
    setDeck(remaining);
    setPlayerCards([playerCards[0], newCard1]);
    setSplitCards([playerCards[1], newCard2]);
    setActiveHand(0); setGameState(GAME_STATE.PLAYING);
  };

  const finishHands = (pCards, sCards, dCards, remainingDeck, mainBet, splitBet) => {
    let dHand = [...dCards]; let d = [...remainingDeck];
    while (handTotal(dHand) < 17) { dHand.push(d[0]); d = d.slice(1); }
    setDealerCards(dHand); setDeck(d); setGameState(GAME_STATE.FINISHED);
    const mainResult = getResultObj(pCards, dHand, mainBet);
    const splitResult = sCards ? getResultObj(sCards, dHand, splitBet) : null;
    const totalPayout = mainResult.payout + (splitResult ? splitResult.payout : 0);
    if (totalPayout > 0) setChips(prev => prev + totalPayout);
    setResults(splitResult ? [mainResult, splitResult] : [mainResult]);
  };

  const canSplit = gameState === GAME_STATE.PLAYING && playerCards.length === 2 &&
    splitCards === null && playerCards[0].value === playerCards[1].value && chips >= currentBet;
  const canDoubleDown = (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.SPLIT_PLAYING) &&
    (activeHand === 0 ? playerCards.length === 2 : splitCards?.length === 2) && chips >= currentBet;
  const isPlaying = gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.SPLIT_PLAYING;
  const countdown = freeRefillCountdown();

  const S = {
    app: { minHeight: '100vh', background: '#030d05', color: '#e0ffe8', fontFamily: "'Courier New', monospace", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' },
    scanlines: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)', pointerEvents: 'none', zIndex: 999 },
    grid: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(0,255,100,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
    section: { background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(0,255,100,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,100,0.1), inset 0 0 20px rgba(0,20,5,0.5)' },
    activeSection: { background: 'rgba(0,20,5,0.8)', border: '2px solid #ff6600', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(255,102,0,0.2)' },
    sectionLabel: { color: '#00ff88', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ff88', marginBottom: '0.5rem' },
    card: { background: 'rgba(255,255,255,0.95)', borderRadius: '8px', width: '60px', height: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, boxShadow: '0 0 15px rgba(0,255,100,0.5), 0 0 30px rgba(255,102,0,0.3)', border: '2px solid rgba(0,255,100,0.5)', flexShrink: 0 },
    hiddenCard: { background: 'linear-gradient(135deg, #001a05, #002200)', borderRadius: '8px', width: '60px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(0,255,100,0.5)', border: '2px solid rgba(255,102,0,0.5)', flexShrink: 0 },
    cardRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.5rem 0' },
    total: { color: '#ffaa00', fontSize: '1.5rem', fontWeight: 900, textShadow: '0 0 10px #ffaa00', textAlign: 'center', marginTop: '0.5rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33, inset 0 0 15px ${color}11`, transition: 'all 0.2s', flex: 1, minWidth: '100px' }),
    betBtn: (active) => ({ background: active ? 'rgba(0,255,100,0.2)' : 'transparent', border: `2px solid ${active ? '#00ff88' : '#333'}`, color: active ? '#00ff88' : '#666', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', textShadow: active ? '0 0 10px #00ff88' : 'none', boxShadow: active ? '0 0 15px #00ff8833' : 'none', letterSpacing: '2px' }),
    resultOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,10,2,0.88)', zIndex: 500, flexDirection: 'column', gap: '1rem', cursor: 'pointer' },
  };

  const mainContent = (
    <>
      {results && gameState === GAME_STATE.FINISHED && (
        <div style={S.resultOverlay} onClick={() => setResults(null)}>
          {results.map((r, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              {results.length > 1 && <div style={{ color: '#666', fontSize: '0.7rem', letterSpacing: '3px', marginBottom: '0.25rem' }}>{i === 0 ? 'HAND 1' : 'HAND 2'}</div>}
              <div style={{ fontSize: results.length > 1 ? 'clamp(1.5rem,5vw,3rem)' : 'clamp(2rem,8vw,5rem)', fontWeight: 900, color: r.color, textShadow: `0 0 20px ${r.color}, 0 0 60px ${r.color}`, letterSpacing: '6px', animation: glitch ? 'glitch 0.1s infinite' : 'none' }}>{r.label}</div>
              <div style={{ color: r.color, fontSize: '1rem', letterSpacing: '4px', textShadow: `0 0 10px ${r.color}` }}>{r.sub}</div>
            </div>
          ))}
          <div style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '1rem' }}>TAP TO CONTINUE</div>
        </div>
      )}

      {/* Chips bar */}
      <div style={{ ...S.section, padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ color: '#ffaa00', fontSize: '1rem', fontWeight: 900, letterSpacing: '2px', textShadow: '0 0 8px #ffaa00' }}>🪙 {chips} CHIPS</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canFreeRefill() ? (
              <button onClick={doFreeRefill} style={{ background: 'rgba(0,255,100,0.15)', border: '1px solid #00ff88', color: '#00ff88', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: '0 0 6px #00ff88' }}>FREE REFILL</button>
            ) : (
              <div style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '1px' }}>Free in {countdown}</div>
            )}
            <button onClick={connectAndPay} disabled={loading} style={{ background: 'transparent', border: '1px solid #ff6600', color: '#ff6600', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }}>
              {loading ? '...' : '+ 1 LCAI'}
            </button>
          </div>
        </div>
        {status && <div style={{ color: '#00ff88', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '0.5rem', textShadow: '0 0 6px #00ff88' }}>⚡ {status}</div>}
      </div>

      {/* Out of chips */}
      {chips === 0 && !isPlaying && (
        <div style={{ ...S.section, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>😬</div>
          <div style={{ color: '#ff4400', fontSize: '0.85rem', letterSpacing: '2px', marginBottom: '1rem', textShadow: '0 0 8px #ff4400' }}>OUT OF CHIPS</div>
          <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '1px', lineHeight: '1.6', marginBottom: '1rem' }}>
            {canFreeRefill() ? 'Claim your free daily refill below.' : `Your free refill is available in ${countdown}.`}
          </div>
          {canFreeRefill() && <button onClick={doFreeRefill} style={{ ...S.btn('#00ff88', false), flex: 'none', width: '100%', marginBottom: '0.5rem' }}>🎁 CLAIM FREE 15 CHIPS</button>}
          <button onClick={connectAndPay} disabled={loading} style={{ ...S.btn('#ff6600', loading), flex: 'none', width: '100%' }}>
            {loading ? '⚡ PROCESSING...' : '💎 BUY 15 CHIPS — 1 LCAI'}
          </button>
        </div>
      )}

      {/* Game */}
      {chips > 0 && (
        <>
          {dealerCards.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionLabel}>◈ Dealer {gameState === GAME_STATE.FINISHED ? `— ${handTotal(dealerCards)}` : ''}</div>
              <div style={S.cardRow}>
                {dealerCards.map((card, i) => {
                  const show = gameState === GAME_STATE.FINISHED || i === 0;
                  if (!show) return <div key={i} style={S.hiddenCard}>🂠</div>;
                  return <div key={i} style={{ ...S.card, color: card.isRed ? '#cc0000' : '#111' }}><div>{card.value}</div><div style={{ fontSize: '1.3rem' }}>{card.suit}</div></div>;
                })}
              </div>
              {gameState === GAME_STATE.FINISHED && <div style={S.total}>{handTotal(dealerCards)}</div>}
            </div>
          )}

          {playerCards.length > 0 && (
            <div style={activeHand === 0 && isPlaying ? S.activeSection : S.section}>
              <div style={S.sectionLabel}>◈ {splitCards ? 'Hand 1' : 'You'} — {handTotal(playerCards)}{activeHand === 0 && isPlaying && <span style={{ color: '#ff6600', marginLeft: '0.5rem' }}>◄ ACTIVE</span>}</div>
              <div style={S.cardRow}>
                {playerCards.map((card, i) => <div key={i} style={{ ...S.card, color: card.isRed ? '#cc0000' : '#111' }}><div>{card.value}</div><div style={{ fontSize: '1.3rem' }}>{card.suit}</div></div>)}
              </div>
              <div style={S.total}>{handTotal(playerCards)}</div>
            </div>
          )}

          {splitCards && (
            <div style={activeHand === 1 && isPlaying ? S.activeSection : S.section}>
              <div style={S.sectionLabel}>◈ Hand 2 — {handTotal(splitCards)}{activeHand === 1 && isPlaying && <span style={{ color: '#ff6600', marginLeft: '0.5rem' }}>◄ ACTIVE</span>}</div>
              <div style={S.cardRow}>
                {splitCards.map((card, i) => <div key={i} style={{ ...S.card, color: card.isRed ? '#cc0000' : '#111' }}><div>{card.value}</div><div style={{ fontSize: '1.3rem' }}>{card.suit}</div></div>)}
              </div>
              <div style={S.total}>{handTotal(splitCards)}</div>
            </div>
          )}

          {isPlaying && (
            <div style={{ ...S.section, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={doHit} style={S.btn('#00ff88', false)}>HIT</button>
              <button onClick={doStand} style={S.btn('#ff6600', false)}>STAND</button>
              {canDoubleDown && <button onClick={doDoubleDown} style={S.btn('#ffaa00', false)}>DOUBLE</button>}
              {canSplit && <button onClick={doSplit} style={S.btn('#00ffcc', false)}>SPLIT</button>}
            </div>
          )}

          {(gameState === GAME_STATE.IDLE || gameState === GAME_STATE.FINISHED) && (
            <div style={S.section}>
              <div style={S.sectionLabel}>◈ Place Your Bet</div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 5].filter(b => b <= chips).map(b => (
                  <button key={b} onClick={() => setBet(b)} style={S.betBtn(bet === b)}>{b}</button>
                ))}
              </div>
              <button onClick={dealGame} style={S.btn('#00ff88', chips < bet)}>🃏 DEAL</button>
            </div>
          )}
        </>
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

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '8px', textTransform: 'uppercase', color: '#00ff88', margin: 0, textShadow: '0 0 10px #00ff88, 0 0 30px #00ff88, 0 0 60px #00cc66', animation: 'pulse 2s infinite' }}>FrankenJack</h1>
        <div style={{ color: '#ff6600', letterSpacing: '6px', fontSize: '0.75rem', textShadow: '0 0 10px #ff6600', marginTop: '0.25rem' }}>◈ FREE BLACKJACK ◈ LIGHTCHAIN AI ◈</div>
        <div style={{ color: '#444', fontSize: '0.65rem', letterSpacing: '2px', marginTop: '0.25rem' }}>Play for free — no real money</div>
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

      {/* FrankenBet link */}
      <a href="https://frankenbet.org" target="_blank" rel="noopener noreferrer" style={{ position: 'fixed', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.8)', border: '1px solid #ff00ff', borderRadius: '8px', padding: '0.5rem 0.9rem', color: '#ff00ff', fontSize: '0.7rem', letterSpacing: '2px', textDecoration: 'none', textShadow: '0 0 8px #ff00ff', boxShadow: '0 0 15px #ff00ff33', zIndex: 100, fontFamily: "'Courier New', monospace", animation: 'pulse 2s infinite' }}>
        💎 PLAY FOR REAL → FRANKENBET.ORG
      </a>

      <div style={{ color: '#111', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', marginTop: 'auto', paddingTop: '3rem', zIndex: 1 }}>
        FrankenApps · Built on LightChain AI
      </div>
    </div>
  );
}