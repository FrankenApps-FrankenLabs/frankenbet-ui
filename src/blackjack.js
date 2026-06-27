import React, { useState } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, isRed: suit === '♥' || suit === '♦' });
    }
  }
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
    const v = cardValue(card);
    if (card.value === 'A') aces++;
    total += v;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function getResultObj(pCards, dCards, betAmount) {
  const pTotal = handTotal(pCards); const dTotal = handTotal(dCards);
  const playerBJ = pTotal === 21 && pCards.length === 2;
  const dealerBJ = dTotal === 21 && dCards.length === 2;
  let payout = 0; let label, color, sub;
  if (playerBJ && dealerBJ) { label = '🔄 PUSH'; color = '#00aaff'; sub = 'Bet returned'; payout = betAmount; }
  else if (playerBJ) { payout = betAmount + betAmount * 1.5; label = '🃏 BLACKJACK!'; color = '#ffd700'; sub = `+${(betAmount * 1.5).toFixed(2)} LCAI`; }
  else if (pTotal > 21) { label = '💀 BUST'; color = '#ff2244'; sub = `Lost ${betAmount.toFixed(2)} LCAI`; payout = 0; }
  else if (dTotal > 21) { payout = betAmount * 2; label = '⚡ DEALER BUSTS!'; color = '#00ff88'; sub = `+${betAmount.toFixed(2)} LCAI`; }
  else if (pTotal > dTotal) { payout = betAmount * 2; label = '⚡ YOU WIN!'; color = '#00ff88'; sub = `+${betAmount.toFixed(2)} LCAI`; }
  else if (pTotal === dTotal) { label = '🔄 PUSH'; color = '#00aaff'; sub = 'Bet returned'; payout = betAmount; }
  else { label = '💀 YOU LOSE'; color = '#ff2244'; sub = `Lost ${betAmount.toFixed(2)} LCAI`; payout = 0; }
  return { label, color, sub, payout };
}

const GAME_STATE = { IDLE: 'idle', PLAYING: 'playing', SPLIT_PLAYING: 'split_playing', FINISHED: 'finished' };

export default function Blackjack({ sessionBalance, setSessionBalance, onBack }) {
  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [deck, setDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [splitCards, setSplitCards] = useState(null);
  const [activeHand, setActiveHand] = useState(0);
  const [bet, setBet] = useState('1');
  const [currentBet, setCurrentBet] = useState(0);
  const [results, setResults] = useState(null);
  const [glitch, setGlitch] = useState(false);
  const [status, setStatus] = useState('');

  const S = {
    section: { background: 'rgba(0,0,20,0.8)', border: '1px solid rgba(255,0,255,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(255,0,255,0.1), inset 0 0 20px rgba(0,0,20,0.5)' },
    activeSection: { background: 'rgba(0,0,20,0.8)', border: '2px solid #00ffcc', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,200,0.2)' },
    sectionLabel: { color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ffcc', marginBottom: '0.5rem' },
    card: { background: 'rgba(255,255,255,0.95)', borderRadius: '8px', width: '60px', height: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, boxShadow: '0 0 15px rgba(255,0,255,0.5), 0 0 30px rgba(0,255,200,0.3)', border: '2px solid rgba(255,0,255,0.5)', flexShrink: 0 },
    hiddenCard: { background: 'linear-gradient(135deg, #1a0033, #000066)', borderRadius: '8px', width: '60px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(255,0,255,0.5)', border: '2px solid rgba(0,255,200,0.5)', flexShrink: 0 },
    cardRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.5rem 0' },
    total: { color: '#ffd700', fontSize: '1.5rem', fontWeight: 900, textShadow: '0 0 10px #ffd700', textAlign: 'center', marginTop: '0.5rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33, inset 0 0 15px ${color}11`, transition: 'all 0.2s', flex: 1, minWidth: '100px' }),
    betBtn: (active) => ({ background: active ? 'rgba(255,0,255,0.2)' : 'transparent', border: `2px solid ${active ? '#ff00ff' : '#333'}`, color: active ? '#ff00ff' : '#666', borderRadius: '6px', padding: '0.5rem 1.5rem', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', textShadow: active ? '0 0 10px #ff00ff' : 'none', boxShadow: active ? '0 0 15px #ff00ff33' : 'none', letterSpacing: '2px' }),
    resultOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,10,0.85)', zIndex: 500, flexDirection: 'column', gap: '1rem', cursor: 'pointer' },
  };

  const dealGame = () => {
    const betNum = parseFloat(bet);
    if (betNum > parseFloat(sessionBalance)) { setStatus('Insufficient session balance.'); return; }
    setResults(null); setStatus(''); setSplitCards(null); setActiveHand(0);
    const newDeck = createDeck();
    const p = [newDeck[0], newDeck[2]]; const d = [newDeck[1], newDeck[3]];
    const remaining = newDeck.slice(4);
    setDeck(remaining); setPlayerCards(p); setDealerCards(d);
    setCurrentBet(betNum); setGameState(GAME_STATE.PLAYING);
    setSessionBalance(prev => (parseFloat(prev) - betNum).toFixed(2));
    if (handTotal(p) === 21) finishHands(p, null, d, remaining, betNum, betNum);
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
    if (currentBet > parseFloat(sessionBalance)) { setStatus('Insufficient session balance to double.'); return; }
    setSessionBalance(prev => (parseFloat(prev) - currentBet).toFixed(2));
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
    if (currentBet > parseFloat(sessionBalance)) { setStatus('Insufficient session balance to split.'); return; }
    setSessionBalance(prev => (parseFloat(prev) - currentBet).toFixed(2));
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
    if (totalPayout > 0) setSessionBalance(prev => (parseFloat(prev) + totalPayout).toFixed(2));
    setResults(splitResult ? [mainResult, splitResult] : [mainResult]);
    if (splitResult || mainResult) { setGlitch(true); setTimeout(() => setGlitch(false), 600); }
  };

  const canSplit = gameState === GAME_STATE.PLAYING && playerCards.length === 2 && splitCards === null && playerCards[0].value === playerCards[1].value && parseFloat(sessionBalance) >= currentBet;
  const canDoubleDown = (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.SPLIT_PLAYING) && (activeHand === 0 ? playerCards.length === 2 : splitCards?.length === 2) && parseFloat(sessionBalance) >= currentBet;
  const isPlaying = gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.SPLIT_PLAYING;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Back button */}
      <div style={{ width: '100%', maxWidth: '600px', marginBottom: '1rem' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #444', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '3px', fontFamily: "'Courier New', monospace" }}>
          ← LOBBY
        </button>
      </div>

      {results && gameState === GAME_STATE.FINISHED && (
        <div style={S.resultOverlay} onClick={() => setResults(null)}>
          {results.map((r, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              {results.length > 1 && <div style={{ color: '#666', fontSize: '0.7rem', letterSpacing: '3px', marginBottom: '0.25rem' }}>{i === 0 ? 'HAND 1' : 'HAND 2'}</div>}
              <div style={{ fontSize: results.length > 1 ? 'clamp(1.5rem, 5vw, 3rem)' : 'clamp(2rem, 8vw, 5rem)', fontWeight: 900, color: r.color, textShadow: `0 0 20px ${r.color}, 0 0 60px ${r.color}`, letterSpacing: '6px', animation: glitch ? 'glitch 0.1s infinite' : 'none' }}>{r.label}</div>
              <div style={{ color: r.color, fontSize: '1rem', letterSpacing: '4px', textShadow: `0 0 10px ${r.color}` }}>{r.sub}</div>
            </div>
          ))}
          <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '1rem' }}>TAP TO CONTINUE</div>
        </div>
      )}

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
          <div style={S.sectionLabel}>◈ {splitCards ? 'Hand 1' : 'You'} — {handTotal(playerCards)}{activeHand === 0 && isPlaying && <span style={{ color: '#ffd700', marginLeft: '0.5rem' }}>◄ ACTIVE</span>}</div>
          <div style={S.cardRow}>
            {playerCards.map((card, i) => <div key={i} style={{ ...S.card, color: card.isRed ? '#cc0000' : '#111' }}><div>{card.value}</div><div style={{ fontSize: '1.3rem' }}>{card.suit}</div></div>)}
          </div>
          <div style={S.total}>{handTotal(playerCards)}</div>
        </div>
      )}

      {splitCards && (
        <div style={activeHand === 1 && isPlaying ? S.activeSection : S.section}>
          <div style={S.sectionLabel}>◈ Hand 2 — {handTotal(splitCards)}{activeHand === 1 && isPlaying && <span style={{ color: '#ffd700', marginLeft: '0.5rem' }}>◄ ACTIVE</span>}</div>
          <div style={S.cardRow}>
            {splitCards.map((card, i) => <div key={i} style={{ ...S.card, color: card.isRed ? '#cc0000' : '#111' }}><div>{card.value}</div><div style={{ fontSize: '1.3rem' }}>{card.suit}</div></div>)}
          </div>
          <div style={S.total}>{handTotal(splitCards)}</div>
        </div>
      )}

      {isPlaying && (
        <div style={{ ...S.section, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={doHit} style={S.btn('#00ffcc', false)}>HIT</button>
          <button onClick={doStand} style={S.btn('#ff00ff', false)}>STAND</button>
          {canDoubleDown && <button onClick={doDoubleDown} style={S.btn('#ffd700', false)}>DOUBLE</button>}
          {canSplit && <button onClick={doSplit} style={S.btn('#aa00ff', false)}>SPLIT</button>}
        </div>
      )}

      {(gameState === GAME_STATE.IDLE || gameState === GAME_STATE.FINISHED) && (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Place Your Bet</div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
            {['1', '2', '3'].map(b => <button key={b} onClick={() => setBet(b)} style={S.betBtn(bet === b)}>{b} LCAI</button>)}
          </div>
          <button onClick={dealGame} style={S.btn('#ff00ff', false)}>🃏 DEAL</button>
        </div>
      )}

      {status && <div style={{ color: '#00ffcc', fontSize: '0.8rem', letterSpacing: '2px', textAlign: 'center', textShadow: '0 0 8px #00ffcc', zIndex: 1, marginBottom: '0.5rem' }}>⚡ {status}</div>}
    </div>
  );
}