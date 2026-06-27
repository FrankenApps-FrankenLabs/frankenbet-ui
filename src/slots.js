import React, { useState, useEffect, useRef } from 'react';

// ─── Symbol definitions ───────────────────────────────────────────────────────
const SYMBOLS = [
  { id: 'cherry',    label: '🍒', name: 'Cherry',     stops: 16 },
  { id: 'lemon',     label: '🍋', name: 'Lemon',      stops: 14 },
  { id: 'orange',    label: '🍊', name: 'Orange',     stops: 12 },
  { id: 'bar',       label: '▬',  name: 'Bar',        stops: 8  },
  { id: 'dblbar',    label: '▬▬', name: 'Double Bar', stops: 6  },
  { id: 'seven',     label: '7',  name: 'Seven',      stops: 4  },
  { id: 'diamond',   label: '💎', name: 'Diamond',    stops: 3  },
  { id: 'frank',     label: '⚡', name: 'Frankenstein', stops: 2 },
];

// Payout table: [s1, s2, s3, s4, s5] = multiplier (0 = no win)
const PAYOUTS = {
  cherry:  { 2: 2,  3: 5,  4: 10, 5: 20  },
  lemon:   { 3: 6,  4: 12, 5: 25  },
  orange:  { 3: 8,  4: 15, 5: 30  },
  bar:     { 3: 10, 4: 20, 5: 50  },
  dblbar:  { 3: 15, 4: 30, 5: 75  },
  seven:   { 3: 20, 4: 50, 5: 100 },
  diamond: { 3: 40, 4: 100, 5: 200 },
  frank:   { 3: 0,  4: 0,  5: 0   }, // triggers free spins
};

// Build virtual reel strip
function buildReel() {
  const strip = [];
  for (const sym of SYMBOLS) {
    for (let i = 0; i < sym.stops; i++) strip.push(sym.id);
  }
  // shuffle
  for (let i = strip.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [strip[i], strip[j]] = [strip[j], strip[i]];
  }
  return strip;
}

function spinReel(strip) {
  return Math.floor(Math.random() * strip.length);
}

function getSymbol(strip, pos) {
  return SYMBOLS.find(s => s.id === strip[pos % strip.length]);
}

function calcPayout(results, bet) {
  // results = [sym, sym, sym, sym, sym] — left to right
  const first = results[0].id;
  let matchCount = 1;
  for (let i = 1; i < 5; i++) {
    if (results[i].id === first) matchCount++;
    else break;
  }

  // Check Frankenstein free spins
  const frankCount = results.filter(s => s.id === 'frank').length;
  if (frankCount >= 3) {
    return { multiplier: 0, payout: 0, label: '⚡ FREE SPINS!', color: '#ffd700', freeSpins: 10 };
  }

  const payRow = PAYOUTS[first];
  if (!payRow || !payRow[matchCount]) {
    // Special: cherry pays on 2+
    if (first === 'cherry' && matchCount >= 2) {
      const mult = payRow[matchCount] || 0;
      if (mult) return { multiplier: mult, payout: bet * mult, label: `🍒 x${matchCount} — WIN!`, color: '#00ff88', freeSpins: 0 };
    }
    return { multiplier: 0, payout: 0, label: '', color: '', freeSpins: 0 };
  }

  const mult = payRow[matchCount];
  return { multiplier: mult, payout: bet * mult, label: `${results[0].label} x${matchCount} — ${mult}x WIN!`, color: '#00ff88', freeSpins: 0 };
}

const REEL_COUNT = 5;
const SPIN_DURATION = 1200; // ms

export default function Slots({ sessionBalance, setSessionBalance, onBack }) {
  const [reels] = useState(() => Array.from({ length: REEL_COUNT }, buildReel));
  const [positions, setPositions] = useState([0, 0, 0, 0, 0]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [bet, setBet] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [status, setStatus] = useState('');
  const spinningRef = useRef(false);

  const S = {
    section: { background: 'rgba(0,0,20,0.8)', border: '1px solid rgba(0,255,200,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '640px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,200,0.1)' },
    sectionLabel: { color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ffcc', marginBottom: '0.75rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33`, transition: 'all 0.2s', flex: 1, minWidth: '100px', fontFamily: "'Courier New', monospace" }),
    betBtn: (active) => ({ background: active ? 'rgba(0,255,200,0.2)' : 'transparent', border: `2px solid ${active ? '#00ffcc' : '#333'}`, color: active ? '#00ffcc' : '#666', borderRadius: '6px', padding: '0.5rem 1.5rem', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', textShadow: active ? '0 0 10px #00ffcc' : 'none', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }),
  };

  async function doSpin() {
    if (spinningRef.current) return;
    const cost = freeSpins > 0 ? 0 : bet;
    if (cost > parseFloat(sessionBalance)) { setStatus('Insufficient session balance.'); return; }

    spinningRef.current = true;
    setSpinning(true);
    setResult(null);
    setStatus('');

    if (cost > 0) setSessionBalance(prev => (parseFloat(prev) - cost).toFixed(2));
    if (freeSpins > 0) setFreeSpins(f => f - 1);

    // Animate reels stopping one by one
    const finalPositions = reels.map(reel => spinReel(reel));

    await new Promise(res => setTimeout(res, SPIN_DURATION));

    setPositions(finalPositions);
    setSpinning(false);
    spinningRef.current = false;

    // Calculate result
    const landed = finalPositions.map((pos, i) => getSymbol(reels[i], pos));
    const outcome = calcPayout(landed, bet);

    if (outcome.freeSpins > 0) {
      setFreeSpins(f => f + outcome.freeSpins);
      setResult({ ...outcome, landed });
    } else if (outcome.payout > 0) {
      setSessionBalance(prev => (parseFloat(prev) + outcome.payout).toFixed(2));
      setResult({ ...outcome, landed });
    } else {
      setResult({ ...outcome, landed });
    }
  }

  const displaySymbols = positions.map((pos, i) => getSymbol(reels[i], pos));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Back button */}
      <div style={{ width: '100%', maxWidth: '640px', marginBottom: '1rem' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #444', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '3px', fontFamily: "'Courier New', monospace" }}>
          ← LOBBY
        </button>
      </div>

      {/* Reels */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ Slots — Center Payline</div>

        {/* Reel display */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
          {displaySymbols.map((sym, i) => (
            <div key={i} style={{
              width: '80px',
              height: '100px',
              background: 'rgba(0,0,40,0.9)',
              border: `2px solid ${spinning ? '#333' : result && result.payout > 0 ? '#00ffcc' : '#1a1a3a'}`,
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              boxShadow: spinning ? 'none' : result && result.payout > 0 ? '0 0 20px #00ffcc55' : 'none',
              transition: 'all 0.3s',
              animation: spinning ? 'slotSpin 0.1s linear infinite' : 'none',
              fontFamily: "'Courier New', monospace",
              color: sym?.id === 'seven' ? '#ff2244' : sym?.id === 'frank' ? '#ffd700' : '#e0e0ff',
            }}>
              <span>{spinning ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].label : sym?.label}</span>
              {!spinning && <span style={{ fontSize: '0.55rem', color: '#444', letterSpacing: '1px', marginTop: '4px' }}>{sym?.name?.toUpperCase()}</span>}
            </div>
          ))}
        </div>

        {/* Payline indicator */}
        <div style={{ textAlign: 'center', color: '#333', fontSize: '0.6rem', letterSpacing: '3px', marginBottom: '0.75rem' }}>
          ── CENTER PAYLINE ──
        </div>

        {/* Result */}
        {result && !spinning && (
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            {result.label ? (
              <div style={{ color: result.color, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '3px', textShadow: `0 0 15px ${result.color}`, fontFamily: "'Courier New', monospace" }}>
                {result.label}
                {result.payout > 0 && <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>+{result.payout.toFixed(2)} LCAI</div>}
              </div>
            ) : (
              <div style={{ color: '#333', fontSize: '0.75rem', letterSpacing: '3px', fontFamily: "'Courier New', monospace" }}>NO WIN — SPIN AGAIN</div>
            )}
          </div>
        )}

        {/* Free spins indicator */}
        {freeSpins > 0 && (
          <div style={{ textAlign: 'center', color: '#ffd700', fontSize: '0.8rem', letterSpacing: '3px', marginBottom: '0.75rem', textShadow: '0 0 10px #ffd700', fontFamily: "'Courier New', monospace" }}>
            ⚡ FREE SPINS REMAINING: {freeSpins}
          </div>
        )}
      </div>

      {/* Bet + Spin */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ {freeSpins > 0 ? `Free Spins — ${freeSpins} remaining` : 'Place Your Bet'}</div>
        {freeSpins === 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
            {[1, 2, 3].map(b => (
              <button key={b} onClick={() => setBet(b)} style={S.betBtn(bet === b)}>{b} LCAI</button>
            ))}
          </div>
        )}
        <button
          onClick={doSpin}
          disabled={spinning || (freeSpins === 0 && parseFloat(sessionBalance) < bet)}
          style={S.btn('#00ffcc', spinning || (freeSpins === 0 && parseFloat(sessionBalance) < bet))}
        >
          {spinning ? '⚡ SPINNING...' : freeSpins > 0 ? '⚡ FREE SPIN' : '🎰 SPIN'}
        </button>
      </div>

      {/* Paytable */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ Paytable (per 1 LCAI bet)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' }}>
          {[
            { sym: '🍒', name: 'Cherry',      pays: '2×/5×/10×/20×' },
            { sym: '🍋', name: 'Lemon',       pays: '6×/12×/25×' },
            { sym: '🍊', name: 'Orange',      pays: '8×/15×/30×' },
            { sym: '▬',  name: 'Bar',         pays: '10×/20×/50×' },
            { sym: '▬▬', name: 'Double Bar',  pays: '15×/30×/75×' },
            { sym: '7',  name: 'Seven',       pays: '20×/50×/100×', red: true },
            { sym: '💎', name: 'Diamond',     pays: '40×/100×/200×' },
            { sym: '⚡', name: 'Frankenstein', pays: '3× = FREE SPINS', gold: true },
          ].map(row => (
            <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', borderBottom: '1px solid #0d0d1a' }}>
              <span style={{ fontSize: '1rem', color: row.red ? '#ff2244' : row.gold ? '#ffd700' : '#e0e0ff', fontFamily: "'Courier New', monospace", width: '28px', textAlign: 'center' }}>{row.sym}</span>
              <div>
                <div style={{ color: '#888', fontSize: '0.6rem', letterSpacing: '1px' }}>{row.name}</div>
                <div style={{ color: row.gold ? '#ffd700' : '#00ffcc', fontSize: '0.6rem', letterSpacing: '1px' }}>{row.pays}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: '#333', fontSize: '0.55rem', marginTop: '0.75rem', letterSpacing: '1px' }}>Payouts shown for 3/4/5 matching symbols left-anchored · Cherry pays on 2+</div>
      </div>

      {status && <div style={{ color: '#ff4444', fontSize: '0.8rem', letterSpacing: '2px', textAlign: 'center', marginBottom: '0.5rem', fontFamily: "'Courier New', monospace" }}>⚡ {status}</div>}

      <style>{`@keyframes slotSpin { 0%{transform:translateY(-4px)} 50%{transform:translateY(4px)} 100%{transform:translateY(-4px)} }`}</style>
    </div>
  );
}