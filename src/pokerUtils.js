// ─── Deck ────────────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ suit, value, isRed: suit === '♥' || suit === '♦' });
  return shuffle(deck);
}

export function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ─── Hand Evaluation ─────────────────────────────────────────────────────────
function cardRank(value) {
  const ranks = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  return ranks[value];
}

function getCounts(cards) {
  const counts = {};
  for (const c of cards) {
    counts[c.value] = (counts[c.value] || 0) + 1;
  }
  return counts;
}

function isFlush(cards) {
  return cards.every(c => c.suit === cards[0].suit);
}

function isStraight(ranks) {
  const sorted = [...new Set(ranks)].sort((a, b) => a - b);
  if (sorted.length < 5) return false;
  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i + 4] - sorted[i] === 4 && new Set(sorted.slice(i, i + 5)).size === 5) return true;
  }
  if (sorted.includes(14)) {
    const low = sorted.map(r => r === 14 ? 1 : r).sort((a, b) => a - b);
    for (let i = 0; i <= low.length - 5; i++) {
      if (low[i + 4] - low[i] === 4 && new Set(low.slice(i, i + 5)).size === 5) return true;
    }
  }
  return false;
}

export function evaluateHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) {
    // Not enough cards yet — score hole cards only
    return scoreHoleOnly(holeCards);
  }
  const combos = getCombinations(all, 5);
  let best = null;
  for (const combo of combos) {
    const score = scoreHand(combo);
    if (!best || compareScores(score, best) > 0) best = score;
  }
  return best;
}

function scoreHoleOnly(holeCards) {
  const ranks = holeCards.map(c => cardRank(c.value)).sort((a, b) => b - a);
  const isPair = holeCards[0].value === holeCards[1].value;
  if (isPair) return [1, ranks[0], ranks[1]];
  return [0, ...ranks];
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function scoreHand(cards) {
  const ranks = cards.map(c => cardRank(c.value)).sort((a, b) => b - a);
  const counts = getCounts(cards);
  const countVals = Object.values(counts).sort((a, b) => b - a);
  const flush = isFlush(cards);
  const straight = isStraight(ranks);

  if (flush && straight) return [8, ...ranks];
  if (countVals[0] === 4) {
    return [7, cardRank(Object.keys(counts).find(k => counts[k] === 4)), cardRank(Object.keys(counts).find(k => counts[k] !== 4))];
  }
  if (countVals[0] === 3 && countVals[1] === 2) {
    return [6, cardRank(Object.keys(counts).find(k => counts[k] === 3)), cardRank(Object.keys(counts).find(k => counts[k] === 2))];
  }
  if (flush) return [5, ...ranks];
  if (straight) return [4, ...ranks];
  if (countVals[0] === 3) {
    const trip = Object.keys(counts).find(k => counts[k] === 3);
    const kickers = Object.keys(counts).filter(k => counts[k] !== 3).map(k => cardRank(k)).sort((a, b) => b - a);
    return [3, cardRank(trip), ...kickers];
  }
  if (countVals[0] === 2 && countVals[1] === 2) {
    const pairs = Object.keys(counts).filter(k => counts[k] === 2).map(k => cardRank(k)).sort((a, b) => b - a);
    const kicker = Object.keys(counts).find(k => counts[k] === 1);
    return [2, ...pairs, cardRank(kicker)];
  }
  if (countVals[0] === 2) {
    const pair = Object.keys(counts).find(k => counts[k] === 2);
    const kickers = Object.keys(counts).filter(k => counts[k] !== 2).map(k => cardRank(k)).sort((a, b) => b - a);
    return [1, cardRank(pair), ...kickers];
  }
  return [0, ...ranks];
}

function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function determineWinner(playerHole, dealerHole, community) {
  const playerScore = evaluateHand(playerHole, community);
  const dealerScore = evaluateHand(dealerHole, community);
  const cmp = compareScores(playerScore, dealerScore);
  if (cmp > 0) return 'player';
  if (cmp < 0) return 'dealer';
  return 'tie';
}

export function getHandName(score) {
  const names = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
  return names[score[0]] || 'High Card';
}

// ─── Dealer AI (Aggressive Rule-Based) ───────────────────────────────────────
export function dealerDecision(holeCards, community) {
  const score = evaluateHand(holeCards, community);
  const handStrength = score ? score[0] : 0;
  const highCard = Math.max(...holeCards.map(c => cardRank(c.value)));
  const isPair = holeCards[0].value === holeCards[1].value;
  const isSuited = holeCards[0].suit === holeCards[1].suit;

  // Pre-flop
  if (community.length === 0) {
    if (isPair && cardRank(holeCards[0].value) >= 10) return 'raise'; // High pair — raise
    if (isPair) return 'call';                                          // Low pair — call
    if (highCard >= 13) return 'raise';                                 // King or Ace high — raise
    if (highCard >= 11 && isSuited) return 'call';                     // Suited connectors — call
    if (highCard >= 10) return 'call';                                  // Decent hand — call
    if (Math.random() < 0.2) return 'call';                            // Bluff 20% of the time
    return 'fold';
  }

  // Flop, Turn, River
  if (handStrength >= 3) return 'raise';  // Three of a kind or better — raise
  if (handStrength === 2) return 'raise'; // Two pair — raise
  if (handStrength === 1) return 'call';  // One pair — call
  if (highCard >= 13) return 'call';      // Ace/King high — call
  if (Math.random() < 0.15) return 'raise'; // Bluff 15% of the time
  if (Math.random() < 0.3) return 'call';   // Call 30% on weak hands
  return 'fold';
}

// Keep for backwards compatibility
export function dealerShouldCall(holeCards, community) {
  const decision = dealerDecision(holeCards, community);
  return decision !== 'fold';
}