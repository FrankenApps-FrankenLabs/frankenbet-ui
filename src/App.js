import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import Lobby from './Lobby';
import Blackjack from './Blackjack';
import Slots from './Slots';

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
const RESTRICTED_COUNTRIES = ['US', 'GB', 'FR', 'NL', 'AU', 'SG', 'CY'];
const RESTRICTED_NAMES = { US: 'United States', GB: 'United Kingdom', FR: 'France', NL: 'Netherlands', AU: 'Australia', SG: 'Singapore', CY: 'Cyprus' };

const NeonPanel = ({ flip }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0.5rem' }}>
    <div style={{ width: '8px', height: '80px', background: 'linear-gradient(180deg, #aa00ff, #ff00ff)', borderRadius: '4px', animation: 'neonPulse1 1.8s ease-in-out infinite' }} />
    <div style={{ width: '22px', height: '22px', background: '#aa00ff', transform: 'rotate(45deg)', borderRadius: '3px', animation: 'neonPulse2 1.2s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#aa00ff', animation: flip ? 'neonPulse2 2.3s ease-in-out infinite' : 'neonPulse1 2.3s ease-in-out infinite', textShadow: '0 0 10px #aa00ff, 0 0 20px #aa00ff' }}>♠</div>
    <div style={{ width: '8px', height: '60px', background: 'linear-gradient(180deg, #ff6600, #ffaa00)', borderRadius: '4px', animation: 'neonOrange1 2s ease-in-out infinite' }} />
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '4px solid #cc00ff', animation: 'neonPulse3 1.5s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#ff00ff', animation: flip ? 'neonPulse1 1.7s ease-in-out infinite' : 'neonPulse2 1.7s ease-in-out infinite', textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff' }}>♥</div>
    <div style={{ width: '20px', height: '20px', background: '#ff6600', transform: 'rotate(45deg)', borderRadius: '2px', animation: 'neonOrange2 1.4s ease-in-out infinite' }} />
    <div style={{ width: '8px', height: '70px', background: 'linear-gradient(180deg, #ff00ff, #aa00ff, #cc00ff)', borderRadius: '4px', animation: 'neonPulse3 1.9s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#cc00ff', animation: 'neonFlicker 3s ease-in-out infinite', textShadow: '0 0 10px #cc00ff, 0 0 20px #cc00ff' }}>♦</div>
    <div style={{ width: '8px', height: '90px', background: 'linear-gradient(180deg, #ffaa00, #ff6600, #ffaa00)', borderRadius: '4px', animation: 'neonOrange1 2.5s ease-in-out infinite' }} />
    <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '22px solid #aa00ff', filter: 'drop-shadow(0 0 6px #aa00ff)', animation: 'neonPulse2 1.4s ease-in-out infinite' }} />
    <div style={{ fontSize: '1.8rem', color: '#aa00ff', animation: flip ? 'neonPulse2 2s ease-in-out infinite' : 'neonPulse3 2s ease-in-out infinite', textShadow: '0 0 10px #aa00ff, 0 0 20px #aa00ff' }}>♣</div>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '4px solid #ff6600', animation: 'neonOrange2 1.8s ease-in-out infinite' }} />
    <div style={{ width: '8px', height: '80px', background: 'linear-gradient(180deg, #aa00ff, #ff00ff)', borderRadius: '4px', animation: 'neonPulse1 2.2s ease-in-out infinite' }} />
    <div style={{ width: '8px', height: '60px', background: 'linear-gradient(180deg, #ff6600, #ffcc00)', borderRadius: '4px', animation: 'neonOrange1 1.6s ease-in-out infinite' }} />
  </div>
);

export default function App() {
  const [geoWarning, setGeoWarning] = useState(null);
  const [geoChecked, setGeoChecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ageCheck, setAgeCheck] = useState(false);
  const [entertainmentCheck, setEntertainmentCheck] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [sessionBalance, setSessionBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('10');
  const [screen, setScreen] = useState('lobby');
  const [game, setGame] = useState(null); // 'blackjack' | 'slots'
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mobile, setMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const code = data.country_code;
        if (RESTRICTED_COUNTRIES.includes(code)) setGeoWarning(RESTRICTED_NAMES[code] || code);
        else setGeoWarning(false);
        setGeoChecked(true);
      })
      .catch(() => { setGeoWarning(false); setGeoChecked(true); });
  }, []);

  const fetchBalances = useCallback(async (ct, address) => {
    try {
      const pb = await ct.getPlayerBalance(address);
      setSessionBalance(parseFloat(formatEther(pb)).toFixed(2));
    } catch (err) { console.error(err); }
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x23F0' }] });
      } catch (switchError) {
        if (switchError.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [LCAI_CHAIN] });
      }
      const prov = new BrowserProvider(window.ethereum);
      const signer = await prov.getSigner();
      const ct = new Contract(CONTRACT_ADDRESS, ABI, signer);
      setWalletAddress(accounts[0]);
      setContract(ct);
      await fetchBalances(ct, accounts[0]);
    } catch (err) { setStatus('Error: ' + err.message); }
  };

  const doDeposit = async () => {
    if (!contract) return;
    setLoading(true); setStatus('Confirm deposit in MetaMask...');
    try {
      const tx = await contract.deposit({ value: parseEther(depositAmount) });
      setStatus('Depositing...');
      await tx.wait();
      await fetchBalances(contract, walletAddress);
      setStatus(''); setScreen('lobby');
    } catch (err) { setStatus('Error: ' + (err.reason || err.message)); }
    setLoading(false);
  };

  const doCashOut = async () => {
    if (!contract) return;
    setLoading(true); setStatus('Cashing out...');
    try {
      const tx = await contract.cashOut();
      await tx.wait();
      await fetchBalances(contract, walletAddress);
      setStatus('Cashed out!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) { setStatus('Error: ' + (err.reason || err.message)); }
    setLoading(false);
  };

  const bothChecked = ageCheck && entertainmentCheck;

  const S = {
    app: { minHeight: '100vh', background: '#050510', color: '#e0e0ff', fontFamily: "'Courier New', monospace", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' },
    scanlines: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)', pointerEvents: 'none', zIndex: 999 },
    grid: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
    section: { background: 'rgba(0,0,20,0.8)', border: '1px solid rgba(255,0,255,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(255,0,255,0.1)' },
    sectionLabel: { color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 8px #00ffcc', marginBottom: '0.5rem' },
    btn: (color, disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'transparent', border: `2px solid ${disabled ? '#333' : color}`, color: disabled ? '#444' : color, borderRadius: '6px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', textShadow: disabled ? 'none' : `0 0 10px ${color}`, boxShadow: disabled ? 'none' : `0 0 15px ${color}33`, transition: 'all 0.2s', flex: 1, minWidth: '100px', fontFamily: "'Courier New', monospace" }),
    checkRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' },
    checkbox: (checked) => ({ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px', border: `2px solid ${checked ? '#00ffcc' : '#444'}`, borderRadius: '4px', background: checked ? 'rgba(0,255,200,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: checked ? '0 0 10px #00ffcc55' : 'none' }),
    input: { background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,0,255,0.3)', borderRadius: '6px', padding: '0.75rem 1rem', color: '#ff00ff', fontSize: '1.1rem', fontWeight: 900, width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px', outline: 'none', fontFamily: "'Courier New', monospace" },
  };

  const mainContent = (
    <>
      {/* Geo warning */}
      {geoChecked && geoWarning && (
        <div style={{ ...S.section, border: '1px solid rgba(255,170,0,0.5)', background: 'rgba(20,10,0,0.9)', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <div style={{ color: '#ffaa00', fontSize: '0.8rem', letterSpacing: '3px', fontWeight: 900, marginBottom: '0.75rem' }}>REGIONAL RESTRICTION DETECTED</div>
          <div style={{ color: '#888', fontSize: '0.75rem', letterSpacing: '1px', lineHeight: '1.7', marginBottom: '1rem' }}>
            Your location (<span style={{ color: '#ffaa00' }}>{geoWarning}</span>) may have restrictions on online gambling. By continuing you confirm that online gambling is legal in your jurisdiction.
          </div>
          <button onClick={() => setGeoWarning(false)} style={{ ...S.btn('#ffaa00', false), flex: 'none', width: '100%' }}>I UNDERSTAND — CONTINUE</button>
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
              I confirm that I am <span style={{ color: '#ffd700', fontWeight: 900 }}>18 years of age or older</span> and that online gambling is legal in my jurisdiction.
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
      ) : screen === 'deposit' ? (
        <div style={S.section}>
          <div style={S.sectionLabel}>◈ Deposit Session Credits</div>
          <div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '1rem', lineHeight: '1.6' }}>Deposit once — play unlimited hands with no MetaMask pop-ups. Cash out anytime.</div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#00ffcc', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>AMOUNT (MIN 10 LCAI)</div>
            <input type="number" min="10" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={S.input} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={doDeposit} disabled={loading} style={S.btn('#ff00ff', loading)}>{loading ? '⚡ DEPOSITING...' : '⚡ DEPOSIT'}</button>
            <button onClick={() => setScreen('lobby')} style={S.btn('#555', false)}>BACK</button>
          </div>
          {status && <div style={{ color: '#00ffcc', fontSize: '0.75rem', letterSpacing: '2px', marginTop: '0.75rem' }}>⚡ {status}</div>}
        </div>
      ) : game === 'blackjack' ? (
        <Blackjack
          sessionBalance={sessionBalance}
          setSessionBalance={setSessionBalance}
          onBack={() => setGame(null)}
        />
      ) : game === 'slots' ? (
        <Slots
          sessionBalance={sessionBalance}
          setSessionBalance={setSessionBalance}
          onBack={() => setGame(null)}
        />
      ) : (
        <Lobby
          walletAddress={walletAddress}
          sessionBalance={sessionBalance}
          onSelect={g => {
            if (parseFloat(sessionBalance) <= 0) { setScreen('deposit'); return; }
            setGame(g);
          }}
          onDeposit={() => setScreen('deposit')}
          onCashOut={doCashOut}
          loading={loading}
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
        @keyframes neonPulse1 { 0%,100%{opacity:1;box-shadow:0 0 8px #aa00ff,0 0 20px #aa00ff,0 0 40px #aa00ff} 50%{opacity:0.4;box-shadow:0 0 4px #aa00ff,0 0 8px #aa00ff} }
        @keyframes neonPulse2 { 0%,100%{opacity:0.4;box-shadow:0 0 4px #ff00ff,0 0 8px #ff00ff} 50%{opacity:1;box-shadow:0 0 8px #ff00ff,0 0 20px #ff00ff,0 0 40px #ff00ff} }
        @keyframes neonPulse3 { 0%,100%{opacity:1;box-shadow:0 0 8px #cc00ff,0 0 20px #cc00ff} 33%{opacity:0.3} 66%{opacity:0.8} }
        @keyframes neonFlicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.2} 94%{opacity:1} 97%{opacity:0.4} 98%{opacity:1} }
        @keyframes neonOrange1 { 0%,100%{opacity:1;box-shadow:0 0 8px #ff6600,0 0 20px #ff6600,0 0 40px #ff6600} 50%{opacity:0.3;box-shadow:0 0 4px #ff6600,0 0 8px #ff6600} }
        @keyframes neonOrange2 { 0%,100%{opacity:0.3;box-shadow:0 0 4px #ffaa00,0 0 8px #ffaa00} 50%{opacity:1;box-shadow:0 0 8px #ffaa00,0 0 20px #ffaa00,0 0 40px #ffaa00} }
        @keyframes slotSpin { 0%{transform:translateY(-4px)} 50%{transform:translateY(4px)} 100%{transform:translateY(-4px)} }
        button:hover:not(:disabled) { filter: brightness(1.3); transform: scale(1.03); }
      `}</style>

      <div style={S.scanlines} />
      <div style={S.grid} />
      <div style={{ position: 'fixed', left: 0, right: 0, height: '2px', background: 'rgba(0,255,200,0.15)', animation: 'scanMove 4s linear infinite', pointerEvents: 'none', zIndex: 998 }} />

      <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '8px', textTransform: 'uppercase', color: '#ff00ff', margin: 0, textShadow: '0 0 10px #ff00ff, 0 0 30px #ff00ff, 0 0 60px #ff00aa', animation: 'pulse 2s infinite' }}>FrankenBet</h1>
        <div style={{ color: '#00ffcc', letterSpacing: '6px', fontSize: '0.75rem', textShadow: '0 0 10px #00ffcc', marginTop: '0.25rem' }}>◈ BLACKJACK · SLOTS · LIGHTCHAIN AI ◈</div>
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

      <div style={{ color: '#222', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', marginTop: 'auto', paddingTop: '2rem', zIndex: 1, textAlign: 'center' }}>
        FrankenApps · Built on LightChain AI
        <br />
        <a href="mailto:frankenlabsadmin@gmail.com" style={{ color: '#222', textDecoration: 'none' }}>frankenlabsadmin@gmail.com</a>
      </div>
    </div>
  );
}