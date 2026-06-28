import React, { useState } from 'react';
import { createDeck, determineWinner, getHandName, evaluateHand, dealerDecision } from './pokerUtils';

const STAGES = { IDLE: 'idle', PREFLOP: 'preflop', FLOP: 'flop', TURN: 'turn', RIVER: 'river', SHOWDOWN: 'showdown' };
const MIN_BET = 5;
const BIG_BLIND = 5;
const SMALL_BLIND = 2;

export default function Poker({ tokens, setTokens, onBack }) {
  const [stage, setStage] = useState(STAGES.IDLE);
  const [deck, setDeck] = useState([]);
  const [playerHole, setPlayerHole] = useState([]);
  const [dealerHole, setDealerHole] = useState([]);
  const [community, setCommunity] = useState([]);
  const [pot, setPot] = useState(0);
  const [playerBet, setPlayerBet] = useState(0);
  const [dealerBet, setDealerBet] = useState(0);
  const [betAmount, setBetAmount] = useState(MIN_BET);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('');
  const [folded, setFolded] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [dealerStatus, setDealerStatus] = useState('');

  const triggerGlitch = () => { setGlitch(true); setTimeout(() => setGlitch(false), 600); };

  const startHand = () => {
    if (tokens < BIG_BLIND) { setStatus('Not enough tokens!'); return; }
    const newDeck = createDeck();
    const pHole = [newDeck[0], newDeck[2]];
    const dHole = [newDeck[1], newDeck[3]];
    const remaining = newDeck.slice(4);
    setDeck(remaining);
    setPlayerHole(pHole);
    setDealerHole(dHole);
    setCommunity([]);
    setFolded(false);
    setResult(null);
    setStatus('');
    setDealerStatus('');
    const bigBlind = Math.min(BIG_BLIND, tokens);
    setPot(SMALL_BLIND + bigBlind);
    setPlayerBet(bigBlind);
    setDealerBet(SMALL_BLIND);
    setTokens(tokens - bigBlind);
    setBetAmount(MIN_BET);
    setStage(STAGES.PREFLOP);
  };

  const doCall = () => {
    const callAmount = Math.max(0, dealerBet - playerBet);
    const actual = Math.min(callAmount || BIG_BLIND, tokens);
    const newPot = pot + actual * 2;
    setTokens(tokens - actual);
    setPot(newPot);
    setPlayerBet(playerBet + actual);
    setDealerStatus('Dealer checks.');
    advanceStage(newPot, [...community]);
  };

  const doRaise = () => {
    if (tokens < betAmount) { setStatus('Not enough tokens to raise.'); return; }
    const newPlayerPot = pot + betAmount;
    setTokens(tokens - betAmount);
    setPlayerBet(playerBet + betAmount);

    // Dealer responds
    const decision = dealerDecision(dealerHole, community);
    if (decision === 'raise') {
      const dealerRaise = betAmount;
      const newPot = newPlayerPot + dealerRaise * 2;
      setPot(newPot);
      setDealerBet(dealerBet + dealerRaise);
      setDealerStatus(`Dealer raises ${dealerRaise}!`);
      if (tokens - betAmount < dealerRaise) {
        // Player can't afford to call dealer raise — auto fold
        setFolded(true);
        finishHand(newPot, true, false);
        return;
      }
      advanceStage(newPot, [...community]);
    } else if (decision === 'call') {
      const newPot = newPlayerPot + betAmount;
      setPot(newPot);
      setDealerBet(dealerBet + betAmount);
      setDealerStatus('Dealer calls.');
      advanceStage(newPot, [...community]);
    } else {
      // Dealer folds
      setDealerStatus('Dealer folds!');
      finishHand(newPlayerPot, false, true);
    }
  };

  const doCheck = () => {
    const decision = dealerDecision(dealerHole, community);
    if (decision === 'raise') {
      const dealerRaise = betAmount;
      const newPot = pot + dealerRaise * 2;
      setPot(newPot);
      setDealerBet(dealerBet + dealerRaise);
      setDealerStatus(`Dealer raises ${dealerRaise}!`);
      advanceStage(newPot, [...community]);
    } else {
      setDealerStatus('Dealer checks.');
      advanceStage(pot, [...community]);
    }
  };

  const doFold = () => {
    setFolded(true);
    finishHand(pot, true, false);
  };

  const advanceStage = (currentPot, currentCommunity) => {
    if (stage === STAGES.PREFLOP) {
      const newCommunity = [deck[0], deck[1], deck[2]];
      setCommunity(newCommunity);
      setDeck(deck.slice(3));
      setStage(STAGES.FLOP);
      setDealerStatus('');
    } else if (stage === STAGES.FLOP) {
      const newCommunity = [...currentCommunity, deck[0]];
      setCommunity(newCommunity);
      setDeck(deck.slice(1));
      setStage(STAGES.TURN);
      setDealerStatus('');
    } else if (stage === STAGES.TURN) {
      const newCommunity = [...currentCommunity, deck[0]];
      setCommunity(newCommunity);
      setDeck(deck.slice(1));
      setStage(STAGES.RIVER);
      setDealerStatus('');
    } else if (stage === STAGES.RIVER) {
      finishHand(currentPot, false, false);
    }
  };

  const finishHand = (finalPot, playerFolded, dealerFoldedVal) => {
    setStage(STAGES.SHOWDOWN);
    triggerGlitch();

    if (playerFolded) {
      setResult({ winner: 'dealer', label: '💀 YOU FOLDED', color: '#ff4400', sub: `Lost ${finalPot} tokens`, payout: 0 });
      return;
    }

    if (dealerFoldedVal) {
      setTokens(prev => prev + finalPot);
      setResult({ winner: 'player', label: '⚡ DEALER FOLDS!', color: '#00ff88', sub: `+${finalPot} tokens`, payout: finalPot });
      return;
    }

    const winner = determineWinner(playerHole, dealerHole, community);
    const playerHandName = getHandName(evaluateHand(playerHole, community));
    const dealerHandName = getHandName(evaluateHand(dealerHole, community));

    if (winner === 'player') {
      setTokens(prev => prev + finalPot);
      setResult({ winner: 'player', label: '⚡ YOU WIN!', color: '#00ff88', sub: `+${finalPot} tokens`, payout: finalPot, playerHand: playerHandName, dealerHand: dealerHandName });
    } else if (winner === 'dealer') {
      setResult({ winner: 'dealer', label: '💀 DEALER WINS', color: '#ff4400', sub: `Lost ${finalPot} tokens`, payout: 0, playerHand: playerHandName, dealerHand: dealerHandName });
    } else {
      const half = Math.floor(finalPot / 2);
      setTokens(prev => prev + half);
      setResult({ winner: 'tie', label: '🔄 SPLIT POT', color: '#ffaa00', sub: `Returned ${half} tokens`, payout: half, playerHand: playerHandName, dealerHand: dealerHandName });
    }
  };

  const isPlaying = [STAGES.PREFLOP, STAGES.FLOP, STAGES.TURN, STAGES.RIVER].includes(stage);
  const canCheck = playerBet >= dealerBet;

  const S = {
    section: { background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(0,255,100,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '680px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,100,0.1)' },
    sectionLabel: { color: '#00ff88', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ff88', marginBottom: '0.75rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33`, transition: 'all 0.2s', flex: 1, minWidth: '80px', fontFamily: "'Courier New', monospace" }),
    betBtn: (active) => ({ background: active ? 'rgba(0,255,100,0.2)' : 'transparent', border: `2px solid ${active ? '#00ff88' : '#333'}`, color: active ? '#00ff88' : '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }),
    card: (isRed) => ({ background: 'rgba(255,255,255,0.95)', borderRadius: '8px', width: '55px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, boxShadow: '0 0 15px rgba(0,255,100,0.5)', border: '2px solid rgba(0,255,100,0.5)', flexShrink: 0, color: isRed ? '#cc0000' : '#111' }),
    hiddenCard: { background: 'linear-gradient(135deg, #001a05, #002200)', borderRadius: '8px', width: '55px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '0 0 15px rgba(0,255,100,0.3)', border: '2px solid rgba(255,102,0,0.5)', flexShrink: 0 },
    cardRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.5rem 0' },
    resultOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,10,2,0.88)', zIndex: 500, flexDirection: 'column', gap: '0.75rem', cursor: 'pointer' },
  };

  const renderCard = (card, i) => (
    <div key={i} style={S.card(card.isRed)}>
      <div>{card.value}</div>
      <div style={{ fontSize: '1.2rem' }}>{card.suit}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Result overlay */}
      {result && stage === STAGES.SHOWDOWN && (
        <div style={S.resultOverlay} onClick={() => { setResult(null); setStage(STAGES.IDLE); }}>
          <div style={{ fontSize: 'clamp(2rem,8vw,4.5rem)', fontWeight: 900, color: result.color, textShadow: `0 0 20px ${result.color}, 0 0 60px ${result.color}`, letterSpacing: '6px', animation: glitch ? 'glitch 0.1s infinite' : 'none' }}>{result.label}</div>
          <div style={{ color: result.color, fontSize: '1rem', letterSpacing: '4px' }}>{result.sub}</div>
          {result.playerHand && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <div style={{ color: '#00ff88', fontSize: '0.8rem', letterSpacing: '3px' }}>YOUR HAND: {result.playerHand}</div>
              <div style={{ color: '#ff6600', fontSize: '0.8rem', letterSpacing: '3px' }}>DEALER HAND: {result.dealerHand}</div>
            </div>
          )}
          <div style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '0.5rem' }}>TAP TO CONTINUE</div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: '680px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #444', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '3px', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }}>← LOBBY</button>
        <div style={{ flex: 1, background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(0,255,100,0.3)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#00ff88', fontSize: '0.65rem', letterSpacing: '3px', fontFamily: "'Courier New', monospace" }}>TOKENS</span>
          <span style={{ color: '#ffaa00', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: '0 0 10px #ffaa00' }}>🪙 {tokens}</span>
        </div>
        {isPlaying && (
          <div style={{ background: 'rgba(0,20,5,0.8)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#ffaa00', fontSize: '0.65rem', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }}>POT: 🪙 {pot}</span>
            <span style={{ color: '#666', fontSize: '0.65rem', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }}>{stage.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Dealer hand */}
      {dealerHole.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Dealer {dealerStatus && <span style={{ color: '#ffaa00', fontSize: '0.65rem', marginLeft: '0.5rem' }}>— {dealerStatus}</span>}</div>
          <div style={S.cardRow}>
            {stage === STAGES.SHOWDOWN && !folded
              ? dealerHole.map((card, i) => renderCard(card, i))
              : dealerHole.map((_, i) => <div key={i} style={S.hiddenCard}>🂠</div>)
            }
          </div>
        </div>
      )}

      {/* Community cards */}
      {community.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Community Cards</div>
          <div style={S.cardRow}>
            {community.map((card, i) => renderCard(card, i))}
          </div>
        </div>
      )}

      {/* Player hand */}
      {playerHole.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Your Hand</div>
          <div style={S.cardRow}>
            {playerHole.map((card, i) => renderCard(card, i))}
          </div>
        </div>
      )}

      {/* Actions */}
      {isPlaying && (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Your Action — {stage.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[5, 10, 20, 50].filter(b => b <= tokens).map(b => (
              <button key={b} onClick={() => setBetAmount(b)} style={S.betBtn(betAmount === b)}>{b}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {canCheck
              ? <button onClick={doCheck} style={S.btn('#00ff88', false)}>CHECK</button>
              : <button onClick={doCall} style={S.btn('#00ff88', tokens < BIG_BLIND)}>CALL</button>
            }
            <button onClick={doRaise} disabled={tokens < betAmount} style={S.btn('#ffaa00', tokens < betAmount)}>RAISE {betAmount}</button>
            <button onClick={doFold} style={S.btn('#ff4400', false)}>FOLD</button>
          </div>
          {status && <div style={{ color: '#ff4444', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '0.75rem' }}>⚡ {status}</div>}
        </div>
      )}

      {/* Start / Idle */}
      {stage === STAGES.IDLE && (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Texas Hold'em — Normal Table</div>
          <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '1rem', lineHeight: '1.8' }}>
            Blinds: {SMALL_BLIND}/{BIG_BLIND} tokens · You post the big blind · Rule-based dealer
          </div>
          {status && <div style={{ color: '#ff4444', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '0.75rem' }}>⚡ {status}</div>}
          <button onClick={startHand} disabled={tokens < BIG_BLIND} style={S.btn('#00ff88', tokens < BIG_BLIND)}>
            🃏 DEAL HAND
          </button>
        </div>
      )}

      <style>{`
        @keyframes glitch { 0%{transform:translate(2px,0) skew(1deg)} 25%{transform:translate(-2px,0) skew(-1deg)} 50%{transform:translate(0,2px)} 75%{transform:translate(0,-2px) skew(0.5deg)} 100%{transform:translate(2px,0)} }
      `}</style>
    </div>
  );
}