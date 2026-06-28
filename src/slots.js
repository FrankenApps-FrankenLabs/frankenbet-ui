import React, { useState, useEffect, useRef } from 'react';

const SERVER_URL = 'https://frankenbet-server.onrender.com';

const SYMBOLS = [
  { id: 'cherry',  label: '🍒', name: 'Cherry'       },
  { id: 'lemon',   label: '🍋', name: 'Lemon'        },
  { id: 'orange',  label: '🍊', name: 'Orange'       },
  { id: 'bar',     label: '▬',  name: 'Bar'          },
  { id: 'dblbar',  label: '▬▬', name: 'Double Bar'   },
  { id: 'seven',   label: '7',  name: 'Seven'        },
  { id: 'diamond', label: '💎', name: 'Diamond'      },
  { id: 'frank',   label: '⚡', name: 'Frankenstein' },
];

const REEL_COUNT = 5;
const SPIN_MS = 1500;

export default function Slots({ sessionBalance, setSessionBalance, onBack }) {
  const [displaySymbols, setDisplaySymbols] = useState(() =>
    Array(REEL_COUNT).fill(SYMBOLS[0])
  );
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [bet, setBet] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [status, setStatus] = useState('');
  const [serverReady, setServerReady] = useState(false);
  const animRef = useRef(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/health`)
      .then(() => setServerReady(true))
      .catch(() => setServerReady(true));
  }, []);

  useEffect(() => {
    if (spinning) {
      animRef.current = setInterval(() => {
        setDisplaySymbols(
          Array(REEL_COUNT).fill(null).map(() =>
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
          )
        );
      }, 80);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [spinning]);

  async function doSpin() {
    if (spinning) return;
    const cost = freeSpins > 0 ? 0 : bet;
    if (cost > parseFloat(sessionBalance)) { setStatus('Insufficient session balance.'); return; }

    setSpinning(true);
    setResult(null);
    setStatus('');

    if (cost > 0) setSessionBalance(prev => (parseFloat(prev) - cost).toFixed(2));
    if (freeSpins > 0) setFreeSpins(f => f - 1);

    try {
      const res = await fetch(`${SERVER_URL}/api/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, freeSpins: freeSpins > 0 }),
      });
      const data = await res.json();

      await new Promise(r => setTimeout(r, SPIN_MS));

      setDisplaySymbols(data.symbols);
      setSpinning(false);

      if (data.freeSpins > 0) {
        setFreeSpins(f => f + data.freeSpins);
      } else if (data.payout > 0) {
        setSessionBalance(prev => (parseFloat(prev) + data.payout).toFixed(2));
      }

      setResult(data);
    } catch (err) {
      await new Promise(r => setTimeout(r, SPIN_MS));
      setSpinning(false);
      setStatus('Server error — try again.');
    }
  }

  const S = {
    section: { background: 'rgba(0,0,20,0.8)', border: '1px solid rgba(0,255,200,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '640px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(0,255,200,0.1)' },
    sectionLabel: { color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ffcc', marginBottom: '0.75rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33`, transition: 'all 0.2s', flex: 1, minWidth: '100px', fontFamily: "'Courier New', monospace" }),
    betBtn: (active) => ({ background: active ? 'rgba(0,255,200,0.2)' : 'transparent', border: `2px solid ${active ? '#00ffcc' : '#333'}`, color: active ? '#00ffcc' : '#666', borderRadius: '6px', padding: '0.5rem 1.5rem', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', textShadow: active ? '0 0 10px #00ffcc' : 'none', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }),
    reel: (win) => ({
      width: '80px',
      height: '110px',
      background: 'rgba(0,0,40,0.9)',
      border: `2px solid ${spinning ? '#1a1a3a' : win ? '#00ffcc' : '#1a1a3a'}`,
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2.2rem',
      boxShadow: !spinning && win ? '0 0 20px #00ffcc55' : 'none',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      fontFamily: "'Courier New', monospace",
      overflow: 'hidden',
    }),
  };

  const isWin = result && result.payout > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Top bar — back button + session balance */}
      <div style={{ width: '100%', maxWidth: '640px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #444', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '3px', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }}>
          ← LOBBY
        </button>
        <div style={{ flex: 1, background: 'rgba(0,0,20,0.8)', border: '1px solid rgba(0,255,200,0.3)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 0 10px rgba(0,255,200,0.1)' }}>
          <span style={{ color: '#00ffcc', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', textShadow: '0 0 8px #00ffcc', fontFamily: "'Courier New', monospace" }}>SESSION</span>
          <span style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', fontFamily: "'Courier New', monospace", textShadow: '0 0 10px #00ffcc' }}>
            {parseFloat(sessionBalance).toFixed(2)} LCAI
          </span>
        </div>
      </div>

      {!serverReady && (
        <div style={{ color: '#444', fontSize: '0.7rem', letterSpacing: '3px', marginBottom: '1rem', fontFamily: "'Courier New', monospace" }}>
          ⚡ WARMING UP SERVER...
        </div>
      )}

      {/* Reels */}
      <div style={S.section}>
        <div style={S.sectionLabel}>◈ Slots — Center Payline</div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
          {displaySymbols.map((sym, i) => (
            <div key={i} style={S.reel(isWin)}>
              <span style={{
                color: sym?.id === 'seven' ? '#ff2244' : sym?.id === 'frank' ? '#ffd700' : '#e0e0ff',
                transition: spinning ? 'none' : 'all 0.2s',
                display: 'block',
                animation: spinning ? `reelBlur 0.08s linear infinite` : 'none',
              }}>
                {sym?.label}
              </span>
              {!spinning && (
                <span style={{ fontSize: '0.5rem', color: '#444', letterSpacing: '1px', marginTop: '4px' }}>
                  {sym?.name?.toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', color: '#222', fontSize: '0.6rem', letterSpacing: '3px', marginBottom: '0.75rem' }}>
          ── CENTER PAYLINE ──
        </div>

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
              <button key={b} onClick={() => setBet(b)} disabled={spinning} style={S.betBtn(bet === b)}>{b} LCAI</button>
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
            { sym: '🍒', name: 'Cherry',       pays: '2×/5×/10×/20×' },
            { sym: '🍋', name: 'Lemon',        pays: '6×/12×/25×' },
            { sym: '🍊', name: 'Orange',       pays: '8×/15×/30×' },
            { sym: '▬',  name: 'Bar',          pays: '10×/20×/50×' },
            { sym: '▬▬', name: 'Double Bar',   pays: '15×/30×/75×' },
            { sym: '7',  name: 'Seven',        pays: '20×/50×/100×', red: true },
            { sym: '💎', name: 'Diamond',      pays: '40×/100×/200×' },
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
        <div style={{ color: '#333', fontSize: '0.55rem', marginTop: '0.75rem', letterSpacing: '1px' }}>3/4/5 matching left-anchored · Cherry pays on 2+</div>
      </div>

      {status && <div style={{ color: '#ff4444', fontSize: '0.8rem', letterSpacing: '2px', textAlign: 'center', marginBottom: '0.5rem', fontFamily: "'Courier New', monospace" }}>⚡ {status}</div>}

      <style>{`
        @keyframes reelBlur {
          0% { transform: translateY(-6px); opacity: 0.7; }
          50% { transform: translateY(6px); opacity: 1; }
          100% { transform: translateY(-6px); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}