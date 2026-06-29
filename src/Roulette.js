import React, { useState, useRef, useEffect } from 'react';

const BACKEND_URL = 'https://frankenapps-frankenlabs-frankenjack.onrender.com';

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

function getColor(n) {
  if (n === 0) return '#00aa44';
  return RED_NUMBERS.includes(n) ? '#cc2200' : '#111111';
}

const BET_TYPES = {
  straight: { payout: 35 },
  red: { payout: 1 },
  black: { payout: 1 },
  odd: { payout: 1 },
  even: { payout: 1 },
  low: { payout: 1 },
  high: { payout: 1 },
  dozen1: { payout: 2 },
  dozen2: { payout: 2 },
  dozen3: { payout: 2 },
  col1: { payout: 2 },
  col2: { payout: 2 },
  col3: { payout: 2 },
};

function checkWin(betType, betValue, result) {
  if (result === 0) return betType === 'straight' && betValue === 0;
  switch (betType) {
    case 'straight': return betValue === result;
    case 'red': return RED_NUMBERS.includes(result);
    case 'black': return !RED_NUMBERS.includes(result) && result !== 0;
    case 'odd': return result % 2 !== 0;
    case 'even': return result % 2 === 0 && result !== 0;
    case 'low': return result >= 1 && result <= 18;
    case 'high': return result >= 19 && result <= 36;
    case 'dozen1': return result >= 1 && result <= 12;
    case 'dozen2': return result >= 13 && result <= 24;
    case 'dozen3': return result >= 25 && result <= 36;
    case 'col1': return result % 3 === 1;
    case 'col2': return result % 3 === 2;
    case 'col3': return result % 3 === 0;
    default: return false;
  }
}

export default function Roulette({ tokens, setTokens, onBack, wallet }) {
  const [bets, setBets] = useState({});
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [winAmount, setWinAmount] = useState(null);
  const [status, setStatus] = useState('');
  const [wheelAngle, setWheelAngle] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef(null);
  const ballIntervalRef = useRef(null);
  const wheelAngleRef = useRef(0);

  const totalBet = Object.values(bets).reduce((sum, b) => sum + b, 0);
  const roundOver = result !== null && !isAnimating;

  useEffect(() => {
    if (spinning) {
      let angle = 0;
      let speed = 25;
      ballIntervalRef.current = setInterval(() => {
        angle -= speed;
        speed = Math.max(2, speed * 0.997);
        setBallAngle(angle);
      }, 16);
    } else {
      clearInterval(ballIntervalRef.current);
    }
    return () => clearInterval(ballIntervalRef.current);
  }, [spinning]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (ballIntervalRef.current) clearInterval(ballIntervalRef.current);
    };
  }, []);

  const updateLeaderboard = async (wins, hands) => {
    if (!wallet) return;
    try {
      await fetch(`${BACKEND_URL}/api/leaderboard/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, slots_wins: wins, total_hands: hands })
      });
    } catch (err) {
      console.error('Leaderboard update failed:', err);
    }
  };

  const placeBet = (type, value = null) => {
    if (spinning || roundOver) return;
    const key = value !== null ? `straight_${value}` : type;
    const current = bets[key] || 0;
    if (totalBet >= 10) { setStatus('Max 10 tokens per spin.'); return; }
    setStatus('');
    setBets(prev => ({ ...prev, [key]: current + 1 }));
  };

  const handleReady = () => {
    setBets({});
    setResult(null);
    setWinAmount(null);
    setStatus('');
    setBallAngle(0);
  };

  const handleClear = () => {
    if (spinning || roundOver) return;
    setBets({});
    setStatus('');
  };

  const spin = () => {
    if (spinning || roundOver) return;
    if (totalBet === 0) { setStatus('Place a bet first!'); return; }
    if (totalBet > tokens) { setStatus('Not enough tokens!'); return; }

    const currentBets = { ...bets };

    setTokens(tokens - totalBet);
    setSpinning(true);
    setResult(null);
    setWinAmount(null);
    setStatus('');
    setIsAnimating(true);

    const winningNumber = Math.floor(Math.random() * 37);
    const winningIndex = WHEEL_NUMBERS.indexOf(winningNumber);
    const segmentAngle = 360 / 37;
    const ballStopAngle = -90;
    const wheelSpins = 8;
    const currentWheelNorm = ((wheelAngleRef.current % 360) + 360) % 360;
    const targetPos = 270;
    const currentSegPos = (currentWheelNorm + winningIndex * segmentAngle) % 360;
    const diff = ((targetPos - currentSegPos) + 360) % 360;
    const wheelFinalAngle = wheelAngleRef.current + wheelSpins * 360 + diff;

    const duration = 5000;
    const start = performance.now();
    const startWheel = wheelAngleRef.current;

    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentWheel = startWheel + (wheelFinalAngle - startWheel) * ease;
      setWheelAngle(currentWheel);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        wheelAngleRef.current = wheelFinalAngle;
        setIsAnimating(false);
        setSpinning(false);
        setBallAngle(ballStopAngle);

        let totalWin = 0;
        Object.entries(currentBets).forEach(([key, amount]) => {
          let betType, betValue;
          if (key.startsWith('straight_')) {
            betType = 'straight';
            betValue = parseInt(key.split('_')[1]);
          } else {
            betType = key;
            betValue = null;
          }
          if (checkWin(betType, betValue, winningNumber)) {
            const payout = BET_TYPES[betType]?.payout || 0;
            totalWin += amount * (payout + 1);
          }
        });

        setResult(winningNumber);
        setWinAmount(totalWin);
        if (totalWin > 0) setTokens(prev => prev + totalWin);
        updateLeaderboard(totalWin > 0 ? 1 : 0, 1);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const isWinnerBet = (key) => {
    if (result === null) return false;
    if (key.startsWith('straight_')) return checkWin('straight', parseInt(key.split('_')[1]), result);
    return checkWin(key, null, result);
  };

  const BALL_R = 115;
  const ballRad = (ballAngle * Math.PI) / 180;
  const ballX = 140 + BALL_R * Math.cos(ballRad);
  const ballY = 140 + BALL_R * Math.sin(ballRad);

  const S = {
    section: { background: 'rgba(10,0,25,0.85)', border: '1px solid rgba(180,0,255,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '100%', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(180,0,255,0.1)' },
    sectionLabel: { color: '#00ff88', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ff88', marginBottom: '0.75rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33`, transition: 'all 0.2s', flex: 1, minWidth: '80px', fontFamily: "'Courier New', monospace" }),
    numBtn: (n, hasBet, isWinner) => ({
      background: isWinner ? 'rgba(255,238,0,0.4)' : hasBet ? `${getColor(n)}88` : `${getColor(n)}55`,
      border: `1px solid ${isWinner ? '#ffee00' : getColor(n) === '#111111' ? '#444' : getColor(n)}`,
      color: '#ffffff',
      borderRadius: '3px',
      padding: '0.5rem 0.1rem',
      fontSize: '0.75rem',
      fontWeight: 900,
      cursor: spinning || roundOver ? 'default' : 'pointer',
      fontFamily: "'Courier New', monospace",
      textAlign: 'center',
      boxShadow: isWinner ? '0 0 12px #ffee0088' : 'none',
      position: 'relative',
    }),
    outsideBtn: (isWinner, color = '#444') => ({
      background: isWinner ? 'rgba(255,238,0,0.3)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${isWinner ? '#ffee00' : color}`,
      color: isWinner ? '#ffee00' : '#aaa',
      borderRadius: '3px',
      padding: '0.5rem 0.25rem',
      fontSize: '0.7rem',
      fontWeight: 900,
      cursor: spinning || roundOver ? 'default' : 'pointer',
      fontFamily: "'Courier New', monospace",
      textAlign: 'center',
      boxShadow: isWinner ? '0 0 12px #ffee0055' : 'none',
      letterSpacing: '1px',
    }),
    zeroBtn: (hasBet, isWinner) => ({
      background: isWinner ? 'rgba(255,238,0,0.4)' : hasBet ? '#00aa4488' : '#00aa4433',
      border: `1px solid ${isWinner ? '#ffee00' : '#00aa44'}`,
      color: '#ffffff',
      borderRadius: '3px',
      padding: '0.3rem 0.5rem',
      fontSize: '0.75rem',
      fontWeight: 900,
      cursor: spinning || roundOver ? 'default' : 'pointer',
      fontFamily: "'Courier New', monospace",
      textAlign: 'center',
      writingMode: 'vertical-rl',
      boxShadow: isWinner ? '0 0 12px #ffee0088' : 'none',
      minHeight: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  };

  const col3 = [], col2 = [], col1 = [];
  for (let i = 1; i <= 12; i++) {
    col3.push(i * 3);
    col2.push(i * 3 - 1);
    col1.push(i * 3 - 2);
  }

  const betChip = (key) => bets[key] ? (
    <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ffee00', color: '#000', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      {bets[key]}
    </span>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #444', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '3px', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }}>← LOBBY</button>
        <div style={{ flex: 1, background: 'rgba(10,0,25,0.85)', border: '1px solid rgba(180,0,255,0.3)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#00ff88', fontSize: '0.65rem', letterSpacing: '3px', fontFamily: "'Courier New', monospace" }}>TOKENS</span>
          <span style={{ color: '#ffee00', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: '0 0 10px #ffee00' }}>🪙 {tokens}</span>
        </div>
        {totalBet > 0 && !roundOver && (
          <div style={{ background: 'rgba(10,0,25,0.85)', border: '1px solid rgba(180,0,255,0.3)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
            <span style={{ color: '#aa44ff', fontSize: '0.75rem', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }}>BET: 🪙 {totalBet}</span>
          </div>
        )}
      </div>

      {/* Wheel */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ European Roulette — Single Zero</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="140" cy="140" r="138" fill="#0a0015" stroke="#aa44ff" strokeWidth="2" />
            <circle cx="140" cy="140" r="128" fill="#0a0015" stroke="#551188" strokeWidth="1" />
            <g transform={`rotate(${wheelAngle}, 140, 140)`}>
              {WHEEL_NUMBERS.map((num, i) => {
                const segAngle = 360 / 37;
                const startAngle = (i * segAngle - segAngle / 2) * Math.PI / 180;
                const endAngle = ((i + 1) * segAngle - segAngle / 2) * Math.PI / 180;
                const r = 124;
                const x1 = 140 + r * Math.cos(startAngle);
                const y1 = 140 + r * Math.sin(startAngle);
                const x2 = 140 + r * Math.cos(endAngle);
                const y2 = 140 + r * Math.sin(endAngle);
                const midAngle = (startAngle + endAngle) / 2;
                const textR = 102;
                const tx = 140 + textR * Math.cos(midAngle);
                const ty = 140 + textR * Math.sin(midAngle);
                return (
                  <g key={`seg_${i}`}>
                    <path d={`M 140 140 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={getColor(num)} stroke="#0a0015" strokeWidth="0.8" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="7" fontWeight="bold" transform={`rotate(${i * segAngle + 90}, ${tx}, ${ty})`} style={{ fontFamily: "'Courier New', monospace" }}>{num}</text>
                  </g>
                );
              })}
              <circle cx="140" cy="140" r="30" fill="#0a0015" stroke="#aa44ff" strokeWidth="2" />
              <circle cx="140" cy="140" r="22" fill="#12002a" stroke="#551188" strokeWidth="1" />
              <text x="140" y="144" textAnchor="middle" fill="#aa44ff" fontSize="12">🎰</text>
            </g>
            <circle cx="140" cy="140" r="126" fill="none" stroke="#1a0030" strokeWidth="3" opacity="0.5" />
            <circle cx={ballX} cy={ballY} r="7" fill="white" filter="url(#glow)" stroke="#ffee00" strokeWidth="1.5" />
          </svg>
        </div>

        {roundOver && (
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: result === 0 ? '#00aa44' : RED_NUMBERS.includes(result) ? '#ff4422' : '#aaaaaa', textShadow: `0 0 20px ${result === 0 ? '#00aa44' : RED_NUMBERS.includes(result) ? '#ff4422' : '#888'}`, letterSpacing: '4px', fontFamily: "'Courier New', monospace" }}>
              {result === 0 ? '🟢' : RED_NUMBERS.includes(result) ? '🔴' : '⚫'} {result}
            </div>
            {winAmount > 0 ? (
              <div style={{ color: '#00ff88', fontSize: '1rem', fontWeight: 900, letterSpacing: '3px', textShadow: '0 0 10px #00ff88', marginTop: '0.25rem' }}>⚡ WIN +{winAmount} TOKENS</div>
            ) : (
              <div style={{ color: '#ff4400', fontSize: '0.85rem', letterSpacing: '3px', marginTop: '0.25rem' }}>💀 NO WIN</div>
            )}
          </div>
        )}

        {status && <div style={{ color: '#ff4444', fontSize: '0.75rem', letterSpacing: '2px', textAlign: 'center', marginBottom: '0.5rem', fontFamily: "'Courier New', monospace" }}>⚡ {status}</div>}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {roundOver ? (
            <button onClick={handleReady} style={S.btn('#ffee00', false)}>✅ READY FOR NEXT ROUND</button>
          ) : (
            <>
              <button onClick={spin} disabled={spinning || totalBet === 0} style={S.btn('#00ff88', spinning || totalBet === 0)}>
                {spinning ? '⚡ SPINNING...' : '🎰 SPIN'}
              </button>
              <button onClick={handleClear} disabled={spinning || totalBet === 0} style={S.btn('#ff4400', spinning || totalBet === 0)}>CLEAR</button>
            </>
          )}
        </div>
      </div>

      {/* Betting Table */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ Place Your Bets {roundOver && <span style={{ color: '#ffee00', fontSize: '0.6rem' }}>— Click READY to place new bets</span>}</div>

        <div style={{ display: 'flex', gap: '2px', width: '100%', opacity: roundOver ? 0.5 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <button onClick={() => placeBet('straight', 0)} style={{ ...S.zeroBtn(!!bets['straight_0'], result === 0 && roundOver), position: 'relative' }}>
              0{betChip('straight_0')}
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2px' }}>
              {col3.map(n => (
                <button key={n} onClick={() => placeBet('straight', n)} style={{ ...S.numBtn(n, !!bets[`straight_${n}`], result === n && roundOver), position: 'relative' }}>
                  {n}{betChip(`straight_${n}`)}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2px' }}>
              {col2.map(n => (
                <button key={n} onClick={() => placeBet('straight', n)} style={{ ...S.numBtn(n, !!bets[`straight_${n}`], result === n && roundOver), position: 'relative' }}>
                  {n}{betChip(`straight_${n}`)}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2px' }}>
              {col1.map(n => (
                <button key={n} onClick={() => placeBet('straight', n)} style={{ ...S.numBtn(n, !!bets[`straight_${n}`], result === n && roundOver), position: 'relative' }}>
                  {n}{betChip(`straight_${n}`)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '55px' }}>
            {['col3', 'col2', 'col1'].map(c => (
              <button key={c} onClick={() => placeBet(c)} style={{ ...S.outsideBtn(isWinnerBet(c)), flex: 1, position: 'relative', fontSize: '0.6rem' }}>
                2:1{bets[c] ? ` (${bets[c]})` : ''}{betChip(c)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', marginTop: '2px', marginLeft: '38px', marginRight: '57px', opacity: roundOver ? 0.5 : 1 }}>
          {[
            { key: 'dozen1', label: '1st 12' },
            { key: 'dozen2', label: '2nd 12' },
            { key: 'dozen3', label: '3rd 12' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => placeBet(key)} style={{ ...S.outsideBtn(isWinnerBet(key)), position: 'relative' }}>
              {label}{bets[key] ? ` (${bets[key]})` : ''} · 2:1{betChip(key)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px', marginTop: '2px', marginLeft: '38px', marginRight: '57px', opacity: roundOver ? 0.5 : 1 }}>
          {[
            { key: 'low', label: '1-18', color: '#666' },
            { key: 'even', label: 'EVEN', color: '#666' },
            { key: 'red', label: '🔴 RED', color: '#cc2200' },
            { key: 'black', label: '⚫ BLACK', color: '#444' },
            { key: 'odd', label: 'ODD', color: '#666' },
            { key: 'high', label: '19-36', color: '#666' },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => placeBet(key)} style={{ ...S.outsideBtn(isWinnerBet(key), color), position: 'relative' }}>
              {label}{bets[key] ? ` (${bets[key]})` : ''}{betChip(key)}
            </button>
          ))}
        </div>

        <div style={{ color: '#333', fontSize: '0.55rem', marginTop: '0.5rem', letterSpacing: '1px', fontFamily: "'Courier New', monospace" }}>
          Click to place 1 token · Max 10 tokens · European single zero
        </div>
      </div>
    </div>
  );
}