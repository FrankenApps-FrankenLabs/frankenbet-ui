import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import frankenLogo from './frankenlabs_logo.png';

const CONTRACT_ADDRESS = '0xc486811E21E680AfdA637B477406C42d76b88959';

const ABI = [
  "function deposit() external payable",
  "function cashOut() external",
  "function getPlayerBalance(address player) external view returns (uint256)",
  "function houseBalance() external view returns (uint256)",
];

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
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const v = cardValue(card);
    if (card.value === 'A') aces++;
    total += v;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function getResultObj(pCards, dCards, betAmount) {
  const pTotal = handTotal(pCards);
  const dTotal = handTotal(dCards);
  const playerBJ = pTotal === 21 && pCards.length === 2;
  const dealerBJ = dTotal === 21 && dCards.length === 2;
  let payout = 0;
  let label, color, sub;
  if (playerBJ && dealerBJ) {
    label = '🔄 PUSH'; color = '#00aaff'; sub = 'Bet returned'; payout = betAmount;
  } else if (playerBJ) {
    payout = betAmount + betAmount * 1.5;
    label = '🃏 BLACKJACK!'; color = '#ffd700'; sub = `+${(betAmount * 1.5).toFixed(2)} LCAI`;
  } else if (pTotal > 21) {
    label = '💀 BUST'; color = '#ff2244'; sub = `Lost ${betAmount.toFixed(2)} LCAI`; payout = 0;
  } else if (dTotal > 21) {
    payout = betAmount * 2;
    label = '⚡ DEALER BUSTS!'; color = '#00ff88'; sub = `+${betAmount.toFixed(2)} LCAI`;
  } else if (pTotal > dTotal) {
    payout = betAmount * 2;
    label = '⚡ YOU WIN!'; color = '#00ff88'; sub = `+${betAmount.toFixed(2)} LCAI`;
  } else if (pTotal === dTotal) {
    label = '🔄 PUSH'; color = '#00aaff'; sub = 'Bet returned'; payout = betAmount;
  } else {
    label = '💀 YOU LOSE'; color = '#ff2244'; sub = `Lost ${betAmount.toFixed(2)} LCAI`; payout = 0;
  }
  return { label, color, sub, payout };
}

const GAME_STATE = { IDLE: 'idle', PLAYING: 'playing', SPLIT_PLAYING: 'split_playing', FINISHED: 'finished' };

// Franken dealer SVG suit body
const FrankenDealer = ({ logoSrc }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '160px' }}>
    {/* Head */}
    <img src={logoSrc} alt="FrankenDealer" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '3px solid #aa00ff', boxShadow: '0 0 20px #aa00ff, 0 0 40px #aa00ff55', zIndex: 2, position: 'relative' }} />
    {/* Neck */}
    <div style={{ width: '28px', height: '18px', background: 'linear-gradient(180deg, #1a0a2a, #0d0d2a)', border: '1px solid #aa00ff55', marginTop: '-2px' }} />
    {/* Suit body SVG */}
    <svg width="160" height="220" viewBox="0 0 160 220" style={{ marginTop: '-2px', filter: 'drop-shadow(0 0 8px #aa00ff55)' }}>
      {/* Shirt */}
      <rect x="45" y="0" width="70" height="120" rx="4" fill="#0a0a1a" />
      {/* Left lapel */}
      <polygon points="80,0 45,0 45,60 80,30" fill="#1a0a2a" stroke="#aa00ff" strokeWidth="1" />
      {/* Right lapel */}
      <polygon points="80,0 115,0 115,60 80,30" fill="#1a0a2a" stroke="#aa00ff" strokeWidth="1" />
      {/* Tie */}
      <polygon points="80,10 72,35 75,90 80,100 85,90 88,35" fill="#ff00ff" opacity="0.9" />
      <polygon points="80,10 74,28 80,32 86,28" fill="#cc00cc" />
      {/* Tie glow */}
      <polygon points="80,10 72,35 75,90 80,100 85,90 88,35" fill="none" stroke="#ff00ff" strokeWidth="0.5" opacity="0.6" />
      {/* Left arm */}
      <rect x="5" y="5" width="40" height="18" rx="9" fill="#1a0a2a" stroke="#aa00ff" strokeWidth="1" />
      {/* Right arm */}
      <rect x="115" y="5" width="40" height="18" rx="9" fill="#1a0a2a" stroke="#aa00ff" strokeWidth="1" />
      {/* Left sleeve cuff */}
      <rect x="5" y="16" width="18" height="8" rx="3" fill="#0a0a1a" stroke="#aa00ff55" strokeWidth="1" />
      {/* Right sleeve cuff */}
      <rect x="137" y="16" width="18" height="8" rx="3" fill="#0a0a1a" stroke="#aa00ff55" strokeWidth="1" />
      {/* Suit jacket left */}
      <polygon points="45,0 10,10 10,120 55,120 55,60" fill="#120820" stroke="#aa00ff" strokeWidth="1" />
      {/* Suit jacket right */}
      <polygon points="115,0 150,10 150,120 105,120 105,60" fill="#120820" stroke="#aa00ff" strokeWidth="1" />
      {/* Pocket square left */}
      <polygon points="22,45 35,45 32,55 19,55" fill="#ff00ff" opacity="0.7" />
      {/* Button 1 */}
      <circle cx="80" cy="108" r="3" fill="#aa00ff" opacity="0.8" />
      {/* Button 2 */}
      <circle cx="80" cy="116" r="3" fill="#aa00ff" opacity="0.8" />
      {/* Pants */}
      <rect x="40" y="118" width="80" height="100" rx="2" fill="#0d0820" stroke="#aa00ff55" strokeWidth="1" />
      {/* Pants crease */}
      <line x1="65" y1="118" x2="65" y2="218" stroke="#aa00ff" strokeWidth="0.5" opacity="0.4" />
      <line x1="95" y1="118" x2="95" y2="218" stroke="#aa00ff" strokeWidth="0.5" opacity="0.4" />
      {/* Belt */}
      <rect x="40" y="116" width="80" height="8" rx="2" fill="#1a0a2a" stroke="#aa00ff" strokeWidth="1" />
      <rect x="75" y="116" width="10" height="8" rx="1" fill="#aa00ff" opacity="0.8" />
      {/* Shoes */}
      <ellipse cx="60" cy="218" rx="22" ry="8" fill="#0a0510" stroke="#aa00ff55" strokeWidth="1" />
      <ellipse cx="100" cy="218" rx="22" ry="8" fill="#0a0510" stroke="#aa00ff55" strokeWidth="1" />
      {/* Neon glow outline on jacket */}
      <polygon points="45,0 10,10 10,120 55,120 55,60" fill="none" stroke="#aa00ff" strokeWidth="0.5" opacity="0.5" />
      <polygon points="115,0 150,10 150,120 105,120 105,60" fill="none" stroke="#aa00ff" strokeWidth="0.5" opacity="0.5" />
    </svg>
    <div style={{ color: '#aa00ff', fontSize: '0.6rem', letterSpacing: '3px', textTransform: 'uppercase', textShadow: '0 0 8px #aa00ff', marginTop: '-10px' }}>THE DEALER</div>
  </div>
);

// Neon lights panel for right side
const NeonLights = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0.5rem' }}>
    <style>{`
      @keyframes neonPulse1 { 0%,100%{opacity:1;box-shadow:0 0 8px #aa00ff,0 0 20px #aa00ff,0 0 40px #aa00ff} 50%{opacity:0.4;box-shadow:0 0 4px #aa00ff,0 0 8px #aa00ff} }
      @keyframes neonPulse2 { 0%,100%{opacity:0.4;box-shadow:0 0 4px #ff00ff,0 0 8px #ff00ff} 50%{opacity:1;box-shadow:0 0 8px #ff00ff,0 0 20px #ff00ff,0 0 40px #ff00ff} }
      @keyframes neonPulse3 { 0%,100%{opacity:1;box-shadow:0 0 8px #cc00ff,0 0 20px #cc00ff} 33%{opacity:0.3} 66%{opacity:0.8} }
      @keyframes neonFlicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.2} 94%{opacity:1} 97%{opacity:0.4} 98%{opacity:1} }
      @keyndef neonSign { 0%,100%{text-shadow:0 0 10px #aa00ff,0 0 20px #aa00ff,0 0 40px #aa00ff} 50%{text-shadow:0 0 5px #aa00ff,0 0 10px #aa00ff} }
    `}</style>

    {/* Vertical neon tube 1 */}
    <div style={{ width: '8px', height: '120px', background: 'linear-gradient(180deg, #aa00ff, #ff00ff, #aa00ff)', borderRadius: '4px', animation: 'neonPulse1 1.8s ease-in-out infinite' }} />

    {/* Diamond shape */}
    <div style={{ width: '24px', height: '24px', background: '#aa00ff', transform: 'rotate(45deg)', animation: 'neonPulse2 1.2s ease-in-out infinite', borderRadius: '3px' }} />

    {/* Vertical neon tube 2 */}
    <div style={{ width: '8px', height: '80px', background: 'linear-gradient(180deg, #ff00ff, #aa00ff)', borderRadius: '4px', animation: 'neonPulse2 2.1s ease-in-out infinite' }} />

    {/* Circle */}
    <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '4px solid #cc00ff', animation: 'neonPulse3 1.5s ease-in-out infinite' }} />

    {/* Vertical neon tube 3 */}
    <div style={{ width: '8px', height: '100px', background: 'linear-gradient(180deg, #aa00ff, #ff00ff, #cc00ff)', borderRadius: '4px', animation: 'neonPulse3 1.9s ease-in-out infinite' }} />

    {/* Playing card suit neon signs */}
    <div style={{ fontSize: '1.8rem', color: '#aa00ff', animation: 'neonPulse1 2.3s ease-in-out infinite', textShadow: '0 0 10px #aa00ff, 0 0 20px #aa00ff' }}>♠</div>
    <div style={{ fontSize: '1.8rem', color: '#ff00ff', animation: 'neonPulse2 1.7s ease-in-out infinite', textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff' }}>♥</div>
    <div style={{ fontSize: '1.8rem', color: '#cc00ff', animation: 'neonFlicker 3s ease-in-out infinite', textShadow: '0 0 10px #cc00ff, 0 0 20px #cc00ff' }}>♦</div>
    <div style={{ fontSize: '1.8rem', color: '#aa00ff', animation: 'neonPulse3 2s ease-in-out infinite', textShadow: '0 0 10px #aa00ff, 0 0 20px #aa00ff' }}>♣</div>

    {/* Vertical neon tube 4 */}
    <div style={{ width: '8px', height: '80px', background: 'linear-gradient(180deg, #ff00ff, #aa00ff)', borderRadius: '4px', animation: 'neonPulse1 2.5s ease-in-out infinite' }} />

    {/* Triangle */}
    <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '22px solid #aa00ff', filter: 'drop-shadow(0 0 6px #aa00ff) drop-shadow(0 0 12px #aa00ff)', animation: 'neonPulse2 1.4s ease-in-out infinite' }} />

    {/* Vertical neon tube 5 */}
    <div style={{ width: '8px', height: '120px', background: 'linear-gradient(180deg, #aa00ff, #ff00ff, #aa00ff)', borderRadius: '4px', animation: 'neonPulse3 1.6s ease-in-out infinite' }} />
  </div>
);

export default function App() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [ageCheck, setAgeCheck] = useState(false);
  const [entertainmentCheck, setEntertainmentCheck] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [sessionBalance, setSessionBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('10');
  const [screen, setScreen] = useState('game');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mobile, setMobile] = useState(window.innerWidth < 900);

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

  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (results) {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 600);
    }
  }, [results]);

  const fetchBalances = useCallback(async (ct, address) => {
    try {
      const pb = await ct.getPlayerBalance(address);
      setSessionBalance(parseFloat(formatEther(pb)).toFixed(2));
    } catch (err) {
      console.error('fetchBalances error:', err);
    }
  }, []);

  const connectWallet = async () => {
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
      const ct = new Contract(CONTRACT_ADDRESS, ABI, signer);
      setWalletAddress(accounts[0]);
      setContract(ct);
      await fetchBalances(ct, accounts[0]);
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  const doDeposit = async () => {
    if (!contract) return;
    setLoading(true);
    setStatus('Confirm deposit in MetaMask...');
    try {
      const tx = await contract.deposit({ value: parseEther(depositAmount) });
      setStatus('Depositing...');
      await tx.wait();
      await fetchBalances(contract, walletAddress);
      setStatus('');
      setScreen('game');
    } catch (err) {
      setStatus('Error: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  const doCashOut = async () => {
    if (!contract) return;
    setLoading(true);
    setStatus('Cashing out...');
    try {
      const tx = await contract.cashOut();
      await tx.wait();
      await fetchBalances(contract, walletAddress);
      setStatus('Cashed out! Funds sent to your wallet.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Error: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  const dealGame = () => {
    const betNum = parseFloat(bet);
    const sessionNum = parseFloat(sessionBalance);
    if (betNum > sessionNum) { setStatus('Insufficient session balance.'); return; }
    setResults(null); setStatus(''); setSplitCards(null); setActiveHand(0);
    const newDeck = createDeck();
    const p = [newDeck[0], newDeck[2]];
    const d = [newDeck[1], newDeck[3]];
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
    const sessionNum = parseFloat(sessionBalance);
    if (currentBet > sessionNum) { setStatus('Insufficient session balance to double.'); return; }
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
    const sessionNum = parseFloat(sessionBalance);
    if (currentBet > sessionNum) { setStatus('Insufficient session balance to split.'); return; }
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
  };

  const canSplit = gameState === GAME_STATE.PLAYING && playerCards.length === 2 &&
    splitCards === null && playerCards[0].value === playerCards[1].value &&
    parseFloat(sessionBalance) >= currentBet;

  const canDoubleDown = (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.SPLIT_PLAYING) &&
    (activeHand === 0 ? playerCards.length === 2 : splitCards?.length === 2) &&
    parseFloat(sessionBalance) >= currentBet;

  const hasSessionBalance = parseFloat(sessionBalance) > 0;
  const isPlaying = gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.SPLIT_PLAYING;
  const bothChecked = ageCheck && entertainmentCheck;

  const S = {
    app: {
      minHeight: '100vh', background: '#050510', color: '#e0e0ff',
      fontFamily: "'Courier New', monospace",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: mobile ? '1rem' : '1rem 1rem 1rem 1rem',
      position: 'relative', overflow: 'hidden',
    },
    scanlines: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      pointerEvents: 'none', zIndex: 999,
    },
    grid: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: 'linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)',
      backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
    },
    section: {
      background: 'rgba(0,0,20,0.8)', border: '1px solid rgba(255,0,255,0.3)',
      borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem',
      width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1,
      boxShadow: '0 0 20px rgba(255,0,255,0.1), inset 0 0 20px rgba(0,0,20,0.5)',
    },
    activeSection: {
      background: 'rgba(0,0,20,0.8)', border: '2px solid #00ffcc',
      borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem',
      width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1,
      boxShadow: '0 0 20px rgba(0,255,200,0.2)',
    },
    sectionLabel: {
      color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '4px',
      textTransform: 'uppercase', textShadow: '0 0 8px #00ffcc', marginBottom: '0.5rem',
    },
    card: {
      background: 'rgba(255,255,255,0.95)', borderRadius: '8px',
      width: '60px', height: '90px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900,
      boxShadow: '0 0 15px rgba(255,0,255,0.5), 0 0 30px rgba(0,255,200,0.3)',
      border: '2px solid rgba(255,0,255,0.5)', flexShrink: 0,
    },
    hiddenCard: {
      background: 'linear-gradient(135deg, #1a0033, #000066)', borderRadius: '8px',
      width: '60px', height: '90px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '1.5rem',
      boxShadow: '0 0 15px rgba(255,0,255,0.5)', border: '2px solid rgba(0,255,200,0.5)', flexShrink: 0,
    },
    cardRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.5rem 0' },
    total: { color: '#ffd700', fontSize: '1.5rem', fontWeight: 900, textShadow: '0 0 10px #ffd700', textAlign: 'center', marginTop: '0.5rem' },
    btn: (color, disabled) => ({
      background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent',
      border: `2px solid ${disabled ? '#333' : color}`,
      color: disabled ? '#444' : color, borderRadius: '6px',
      padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900,
      letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer',
      textShadow: disabled ? 'none' : `0 0 10px ${color}`,
      boxShadow: disabled ? 'none' : `0 0 15px ${color}33, inset 0 0 15px ${color}11`,
      transition: 'all 0.2s', flex: 1, minWidth: '100px',
    }),
    betBtn: (active) => ({
      background: active ? 'rgba(255,0,255,0.2)' : 'transparent',
      border: `2px solid ${active ? '#ff00ff' : '#333'}`,
      color: active ? '#ff00ff' : '#666', borderRadius: '6px',
      padding: '0.5rem 1.5rem', fontSize: '1rem', fontWeight: 900, cursor: 'pointer',
      textShadow: active ? '0 0 10px #ff00ff' : 'none',
      boxShadow: active ? '0 0 15px #ff00ff33' : 'none', letterSpacing: '2px',
    }),
    input: {
      background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,0,255,0.3)',
      borderRadius: '6px', padding: '0.75rem 1rem', color: '#ff00ff',
      fontSize: '1.1rem', fontWeight: 900, width: '100%', boxSizing: 'border-box',
      textAlign: 'center', letterSpacing: '2px', outline: 'none', fontFamily: "'Courier New', monospace",
    },
    resultOverlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,10,0.85)', zIndex: 500,
      flexDirection: 'column', gap: '1rem', cursor: 'pointer',
    },
    checkRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' },
    checkbox: (checked) => ({
      width: '20px', height: '20px', flexShrink: 0, marginTop: '2px',
      border: `2px solid ${checked ? '#00ffcc' : '#444'}`, borderRadius: '4px',
      background: checked ? 'rgba(0,255,200,0.2)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.2s', boxShadow: checked ? '0 0 10px #00ffcc55' : 'none',
    }),
  };

  const mainContent = (
    <>
      {/* Result overlay */}
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

      {/* Acknowledgement */}
      {!acknowledged ? (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Before You Play</div>
          <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '1.5rem', lineHeight: '1.8' }}>Please confirm the following before connecting your wallet.</div>
          <div style={S.checkRow} onClick={() => setAgeCheck(!ageCheck)}>
            <div style={S.checkbox(ageCheck)}>{ageCheck && <span style={{ color: '#00ffcc', fontSize: '0.8rem', fontWeight: 900 }}>✓</span>}</div>
            <div style={{ color: ageCheck ? '#e0e0ff' : '#666', fontSize: '0.82rem', letterSpacing: '1px', lineHeight: '1.6', transition: 'color 0.2s' }}>
              I confirm that I am <span style={{ color: '#ffd700', fontWeight: 900 }}>18 years of age or older</span> (or 21 where required by local law) and that online gambling is legal in my jurisdiction.
            </div>
          </div>
          <div style={S.checkRow} onClick={() => setEntertainmentCheck(!entertainmentCheck)}>
            <div style={S.checkbox(entertainmentCheck)}>{entertainmentCheck && <span style={{ color: '#00ffcc', fontSize: '0.8rem', fontWeight: 900 }}>✓</span>}</div>
            <div style={{ color: entertainmentCheck ? '#e0e0ff' : '#666', fontSize: '0.82rem', letterSpacing: '1px', lineHeight: '1.6', transition: 'color 0.2s' }}>
              I understand that FrankenBet is a <span style={{ color: '#ffd700', fontWeight: 900 }}>decentralised application for entertainment purposes only</span>. Play responsibly.
            </div>
          </div>
          <button onClick={() => bothChecked && setAcknowledged(true)} style={S.btn('#ff00ff', !bothChecked)}>
            {bothChecked ? '⚡ ENTER FRANKENBET' : '🔒 TICK BOTH TO CONTINUE'}
          </button>
        </div>
      ) : !walletAddress ? (
        <div style={{ ...S.section, textAlign: 'center' }}>
          <div style={{ color: '#ff00ff', fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 20px #ff00ff' }}>🃏</div>
          <div style={{ color: '#00ffcc', letterSpacing: '3px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>CONNECT YOUR WALLET TO PLAY</div>
          <button onClick={connectWallet} style={S.btn('#ff00ff', false)}>⚡ Connect Wallet</button>
          {status && <div style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: '0.75rem', letterSpacing: '2px' }}>⚡ {status}</div>}
        </div>
      ) : (
        <>
          {/* Wallet bar */}
          <div style={{ ...S.section, padding: '0.5rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '2px' }}>✅ {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</div>
              <div style={{ color: '#ff00ff', fontSize: '0.7rem', letterSpacing: '2px' }}>SESSION: {sessionBalance} LCAI</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setScreen('deposit')} style={{ background: 'transparent', border: '1px solid #ff00ff', color: '#ff00ff', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }}>+ DEPOSIT</button>
                {hasSessionBalance && !isPlaying && (
                  <button onClick={doCashOut} disabled={loading} style={{ background: 'transparent', border: '1px solid #00ffcc', color: '#00ffcc', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '2px', fontFamily: "'Courier New', monospace" }}>CASH OUT</button>
                )}
              </div>
            </div>
          </div>

          {screen === 'deposit' && (
            <div style={S.section}>
              <div style={S.sectionLabel}>◈ Deposit Session Credits</div>
              <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '1rem', lineHeight: '1.6' }}>Deposit once — play unlimited hands with no MetaMask pop-ups. Cash out anytime.</div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>AMOUNT (MIN 10 LCAI)</div>
                <input type="number" min="10" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={S.input} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={doDeposit} disabled={loading} style={S.btn('#ff00ff', loading)}>{loading ? '⚡ DEPOSITING...' : '⚡ DEPOSIT'}</button>
                <button onClick={() => setScreen('game')} style={S.btn('#555', false)}>BACK</button>
              </div>
              {status && <div style={{ color: '#00ffcc', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '0.75rem' }}>⚡ {status}</div>}
            </div>
          )}

          {screen === 'game' && (
            <>
              {!hasSessionBalance ? (
                <div style={{ ...S.section, textAlign: 'center' }}>
                  <div style={{ color: '#ffd700', fontSize: '0.85rem', letterSpacing: '2px', marginBottom: '1rem', textShadow: '0 0 8px #ffd700' }}>◈ NO SESSION BALANCE</div>
                  <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '1.5rem', lineHeight: '1.6' }}>Deposit LCAI to start playing. One deposit = unlimited hands. No MetaMask pop-ups mid-game.</div>
                  <button onClick={() => setScreen('deposit')} style={S.btn('#ff00ff', false)}>+ DEPOSIT TO PLAY</button>
                </div>
              ) : (
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
                </>
              )}
              {status && <div style={{ color: '#00ffcc', fontSize: '0.8rem', letterSpacing: '2px', textAlign: 'center', textShadow: '0 0 8px #00ffcc', zIndex: 1, marginBottom: '0.5rem' }}>⚡ {status}</div>}
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <div style={S.app}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.85} }
        @keyframes glitch {
          0%{transform:translate(2px,0) skew(1deg)} 25%{transform:translate(-2px,0) skew(-1deg)}
          50%{transform:translate(0,2px)} 75%{transform:translate(0,-2px) skew(0.5deg)} 100%{transform:translate(2px,0)}
        }
        @keyframes scanMove { 0%{top:0} 100%{top:100%} }
        @keyframes neonPulse1 { 0%,100%{opacity:1;box-shadow:0 0 8px #aa00ff,0 0 20px #aa00ff,0 0 40px #aa00ff} 50%{opacity:0.4;box-shadow:0 0 4px #aa00ff,0 0 8px #aa00ff} }
        @keyframes neonPulse2 { 0%,100%{opacity:0.4;box-shadow:0 0 4px #ff00ff,0 0 8px #ff00ff} 50%{opacity:1;box-shadow:0 0 8px #ff00ff,0 0 20px #ff00ff,0 0 40px #ff00ff} }
        @keyframes neonPulse3 { 0%,100%{opacity:1;box-shadow:0 0 8px #cc00ff,0 0 20px #cc00ff} 33%{opacity:0.3} 66%{opacity:0.8} }
        @keyframes neonFlicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.2} 94%{opacity:1} 97%{opacity:0.4} 98%{opacity:1} }
        button:hover:not(:disabled) { filter: brightness(1.3); transform: scale(1.03); }
      `}</style>

      <div style={S.scanlines} />
      <div style={S.grid} />
      <div style={{ position: 'fixed', left: 0, right: 0, height: '2px', background: 'rgba(0,255,200,0.15)', animation: 'scanMove 4s linear infinite', pointerEvents: 'none', zIndex: 998 }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '8px', textTransform: 'uppercase', color: '#ff00ff', margin: 0, textShadow: '0 0 10px #ff00ff, 0 0 30px #ff00ff, 0 0 60px #ff00aa', animation: 'pulse 2s infinite' }}>FrankenBet</h1>
        <div style={{ color: '#00ffcc', letterSpacing: '6px', fontSize: '0.75rem', textShadow: '0 0 10px #00ffcc', marginTop: '0.25rem' }}>◈ BLACKJACK ◈ LIGHTCHAIN AI ◈</div>
      </div>

      {mobile ? (
        // Mobile — simple centered layout
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {mainContent}
        </div>
      ) : (
        // Desktop — three column layout
        <div style={{ display: 'flex', width: '100%', maxWidth: '1100px', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* Left — Franken dealer */}
          <div style={{ width: '180px', flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: '1rem', position: 'sticky', top: '1rem' }}>
            <FrankenDealer logoSrc={frankenLogo} />
          </div>

          {/* Centre — game */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
            {mainContent}
          </div>

          {/* Right — neon lights */}
          <div style={{ width: '80px', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'sticky', top: '1rem' }}>
            <NeonLights />
          </div>
        </div>
      )}

      <div style={{ color: '#222', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', marginTop: 'auto', paddingTop: '2rem', zIndex: 1 }}>
        FrankenApps · Built on LightChain AI
      </div>
    </div>
  );
}