import { useState } from 'react';
import { api } from '../api/client.js';
import { useCouple } from '../context/CoupleContext.jsx';

// couple에 아직 빈 슬롯(배우자 미가입)이 있을 때 대시보드 상단에 보여주는 초대 코드 배너
export default function InviteBanner({ couple }) {
  const { reload } = useCouple();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerate = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/couples/regenerate-invite');
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(couple.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없어도 코드가 화면에 보이므로 무시
    }
  };

  return (
    <div className="card">
      <h2>배우자를 기다리고 있어요</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        아래 초대 코드를 배우자에게 공유해서 가입하게 해주세요. 배우자가 가입하기 전까지는 혼자서도 계속 사용할 수 있어요.
      </p>
      <div className="invite-code-box">{couple.invite_code}</div>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={copy}>
          {copied ? '복사됨!' : '코드 복사'}
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={regenerate} disabled={busy}>
          코드 재발급
        </button>
        <button className="btn-ghost" onClick={() => reload()}>새로고침</button>
      </div>
    </div>
  );
}
