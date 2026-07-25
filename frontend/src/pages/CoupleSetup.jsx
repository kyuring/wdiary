import { useState } from 'react';
import { api } from '../api/client.js';
import { useCouple } from '../context/CoupleContext.jsx';

function CreateCoupleForm({ onBack }) {
  const { reload } = useCouple();
  const [role, setRole] = useState('groom');
  const [weddingDate, setWeddingDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/couples', { role, wedding_date: weddingDate || undefined });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>커플 프로필 만들기</h1>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="role">저는</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="groom">신랑이에요</option>
              <option value="bride">신부에요</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="weddingDate">결혼식 날짜 (나중에 입력해도 돼요)</label>
            <input
              id="weddingDate"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? '만드는 중...' : '만들기'}
          </button>
        </form>
        <button className="btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={onBack}>
          뒤로
        </button>
      </div>
    </div>
  );
}

function JoinCoupleForm({ onBack }) {
  const { reload } = useCouple();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/couples/join', { invite_code: code.trim().toUpperCase() });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>초대 코드로 참여하기</h1>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="code">배우자에게 받은 6자리 코드</label>
            <input
              id="code"
              type="text"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ textTransform: 'uppercase', letterSpacing: 2 }}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? '참여하는 중...' : '참여하기'}
          </button>
        </form>
        <button className="btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={onBack}>
          뒤로
        </button>
      </div>
    </div>
  );
}

function ChoiceScreen({ onChoose }) {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <h1>커플 연결하기</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 20 }}>
          둘 중 한 명이 먼저 커플 프로필을 만들고, 배우자가 초대 코드로 참여하면 같은 공간을 공유하게 돼요.
        </p>
        <div className="setup-choice">
          <div className="choice-card" onClick={() => onChoose('create')}>
            <h3>커플 만들기</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              처음이라면 여기서 시작하세요. 초대 코드가 발급돼요.
            </p>
          </div>
          <div className="choice-card" onClick={() => onChoose('join')}>
            <h3>초대 코드로 참여</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              배우자가 이미 만들었다면 받은 코드를 입력하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoupleSetup() {
  const { loading } = useCouple();
  const [view, setView] = useState('choice');

  // couple이 생기는 순간(배우자 미가입 상태 포함) App.jsx의 라우트 가드가 "/"로 보내므로
  // 이 컴포넌트는 couple이 없는 상태에서만 렌더링된다.
  if (loading) return <div className="full-page-center">불러오는 중...</div>;

  if (view === 'create') return <CreateCoupleForm onBack={() => setView('choice')} />;
  if (view === 'join') return <JoinCoupleForm onBack={() => setView('choice')} />;
  return <ChoiceScreen onChoose={setView} />;
}
