import { useState } from 'react';
import { api } from '../api/client.js';
import { useCouple } from '../context/CoupleContext.jsx';

// couple에 아직 빈 슬롯(배우자 미가입)이 있을 때 대시보드 상단에 보여주는 초대 코드 배너
export default function InviteBanner({ couple }) {
  const { reload } = useCouple();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchCode, setSwitchCode] = useState('');

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

  const onSwitchSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/couples/switch', { invite_code: switchCode.trim().toUpperCase() });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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

      {!switching && (
        <button
          className="btn-ghost"
          style={{ marginTop: 12, fontSize: '0.8rem' }}
          onClick={() => setSwitching(true)}
        >
          배우자가 이미 만든 코드가 있나요? 그 코드로 참여할게요
        </button>
      )}
      {switching && (
        <form onSubmit={onSwitchSubmit} style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
            ⚠️ 참여하면 지금 이 초대 코드와 여기 입력해둔 내용은 모두 사라져요.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              maxLength={6}
              required
              placeholder="배우자의 6자리 코드"
              value={switchCode}
              onChange={(e) => setSwitchCode(e.target.value)}
              style={{ textTransform: 'uppercase', letterSpacing: 2, flex: 1 }}
            />
            <button className="btn-primary" type="submit" disabled={busy}>참여하기</button>
            <button className="btn-ghost" type="button" onClick={() => setSwitching(false)}>취소</button>
          </div>
        </form>
      )}
    </div>
  );
}
