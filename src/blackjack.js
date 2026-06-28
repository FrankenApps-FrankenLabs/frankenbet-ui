import React from 'react';

export default function Lobby({ onSelect, sessionBalance, walletAddress, onDeposit, onCashOut, loading }) {
  const S = {
    lobby: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '700px',
      gap: '2rem',
      zIndex: 1,
      position: 'relative',
    },
    balanceBar: {
      background: 'rgba(0,0,20,0.8)',
      border: '1px solid rgba(255,0,255,0.3)',
      borderRadius: '12px',
      padding: '0.75rem 1.5rem',
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '0.5rem',
      boxShadow: '0 0 20px rgba(255,0,255,0.1)',
    },
    walletText: {
      color: '#00ffcc',
      fontSize: '0.7rem',
      letterSpacing: '2px',
      fontFamily: "'Courier New', monospace",
    },
    balanceText: {
      color: '#ff00ff',
      fontSize: '0.7rem',
      letterSpacing: '2px',
      fontFamily: "'Courier New', monospace",
    },
    btnRow: {
      display: 'flex',
      gap: '0.5rem',
    },
    smallBtn: (color) => ({
      background: 'transparent',
      border: `1px solid ${color}`,
      color: color,
      borderRadius: '4px',
      padding: '0.3rem 0.75rem',
      fontSize: '0.7rem',
      cursor: 'pointer',
      letterSpacing: '2px',
      fontFamily: "'Courier New', monospace",
    }),
    cards: {
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
    },
    gameCard: (color) => ({
      background: 'rgba(0,0,20,0.85)',
      border: `2px solid ${color}`,
      borderRadius: '16px',
      padding: '2.5rem 2rem',
      width: '280px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      cursor: 'pointer',
      boxShadow: `0 0 30px ${color}44, inset 0 0 30px rgba(0,0,20,0.5)`,
      transition: 'all 0.2s',
      textDecoration: 'none',
    }),
    gameIcon: {
      fontSize: '4rem',
      lineHeight: 1,
    },
    gameTitle: (color) => ({
      color: color,
      fontSize: '1.4rem',
      fontWeight: 900,
      letterSpacing: '6px',
      textTransform: 'uppercase',
      textShadow: `0 0 10px ${color}, 0 0 30px ${color}`,
      fontFamily: "'Courier New', monospace",
    }),
    gameDesc: {
      color: '#666',
      fontSize: '0.72rem',
      letterSpacing: '2px',
      textAlign: 'center',
      lineHeight: '1.7',
      fontFamily: "'Courier New', monospace",
    },
    playBtn: (color) => ({
      background: 'transparent',
      border: `2px solid ${color}`,
      color: color,
      borderRadius: '6px',
      padding: '0.6rem 2rem',
      fontSize: '0.85rem',
      fontWeight: 900,
      letterSpacing: '4px',
      cursor: 'pointer',
      textShadow: `0 0 10px ${color}`,
      boxShadow: `0 0 15px ${color}33`,
      fontFamily: "'Courier New', monospace",
      marginTop: '0.5rem',
    }),
    footer: {
      color: '#333',
      fontSize: '0.65rem',
      letterSpacing: '4px',
      textTransform: 'uppercase',
      fontFamily: "'Courier New', monospace",
      textAlign: 'center',
    },
    responsible: {
      color: '#444',
      fontSize: '0.65rem',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      fontFamily: "'Courier New', monospace",
      textAlign: 'center',
      marginTop: '0.5rem',
    },
  };

  return (
    <div style={S.lobby}>
      {/* Balance bar */}
      <div style={S.balanceBar}>
        <span style={S.walletText}>✅ {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</span>
        <span style={S.balanceText}>SESSION: {sessionBalance} LCAI</span>
        <div style={S.btnRow}>
          <button onClick={onDeposit} style={S.smallBtn('#ff00ff')}>+ DEPOSIT</button>
          {parseFloat(sessionBalance) > 0 && !loading && (
            <button onClick={onCashOut} style={S.smallBtn('#00ffcc')}>CASH OUT</button>
          )}
        </div>
      </div>

      {/* Game cards */}
      <div style={S.cards}>
        {/* Blackjack */}
        <div
          style={S.gameCard('#ff00ff')}
          onClick={() => onSelect('blackjack')}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={S.gameIcon}>🃏</div>
          <div style={S.gameTitle('#ff00ff')}>Blackjack</div>
          <div style={S.gameDesc}>
            Classic 21 · Split · Double Down<br />
            Bets from 1 LCAI
          </div>
          <button style={S.playBtn('#ff00ff')}>▶ PLAY</button>
        </div>

        {/* Slots */}
        <div
          style={S.gameCard('#00ffcc')}
          onClick={() => onSelect('slots')}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={S.gameIcon}>🎰</div>
          <div style={S.gameTitle('#00ffcc')}>Slots</div>
          <div style={S.gameDesc}>
            5 Reels · 8 Symbols · 93.69% RTP<br />
            Bets from 1 LCAI
          </div>
          <button style={S.playBtn('#00ffcc')}>▶ PLAY</button>
        </div>
      </div>

      {/* Footer */}
      <div>
        <div style={S.responsible}>⚠ Play Responsibly</div>
        <div style={S.footer}>FrankenApps · Built on LightChain AI</div>
        <div style={{ ...S.footer, marginTop: '0.25rem' }}>
          <a href="mailto:frankenlabsadmin@gmail.com" style={{ color: '#333', textDecoration: 'none' }}>frankenlabsadmin@gmail.com</a>
        </div>
      </div>
    </div>
  );
}