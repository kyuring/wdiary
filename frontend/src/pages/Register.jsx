import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import PasswordInput from '../components/PasswordInput.jsx';

const USERNAME_RE = /^[a-z0-9_]{4,20}$/;
const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,12}$/;

const CHECK_MESSAGES = {
  checking: { text: '확인 중...', color: 'var(--text-muted)' },
  available: { text: '사용할 수 있어요.', color: 'var(--success)' },
  taken: { text: '이미 사용 중이에요.', color: 'var(--danger)' },
};

function CheckField({ label, id, name, value, onChange, onCheck, check, invalidMessage, ...inputProps }) {
  const message =
    check === 'invalid'
      ? { text: invalidMessage, color: 'var(--danger)' }
      : CHECK_MESSAGES[check];

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id={id} name={name} type="text" required value={value} onChange={onChange} style={{ flex: 1 }} {...inputProps} />
        <button type="button" className="btn-secondary" onClick={onCheck}>
          중복확인
        </button>
      </div>
      {message && <span style={{ fontSize: '0.8rem', color: message.color }}>{message.text}</span>}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 'checking' | 'available' | 'taken' | 'invalid' | null(아직 확인 안 함)
  const [usernameCheck, setUsernameCheck] = useState(null);
  const [nicknameCheck, setNicknameCheck] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'username') setUsernameCheck(null); // 값이 바뀌면 다시 확인해야 함
    if (name === 'nickname') setNicknameCheck(null);
  };

  const checkUsername = async () => {
    const username = form.username.toLowerCase();
    if (!USERNAME_RE.test(username)) return setUsernameCheck('invalid');
    setUsernameCheck('checking');
    try {
      const result = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
      setUsernameCheck(result.available ? 'available' : 'taken');
    } catch {
      setUsernameCheck(null);
    }
  };

  const checkNickname = async () => {
    if (!NICKNAME_RE.test(form.nickname)) return setNicknameCheck('invalid');
    setNicknameCheck('checking');
    try {
      const result = await api.get(`/auth/check-nickname?nickname=${encodeURIComponent(form.nickname)}`);
      setNicknameCheck(result.available ? 'available' : 'taken');
    } catch {
      setNicknameCheck(null);
    }
  };

  const canSubmit = usernameCheck === 'available' && nicknameCheck === 'available';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('아이디와 닉네임 중복확인을 먼저 통과해야 가입할 수 있어요.');
      return;
    }
    setSubmitting(true);
    try {
      await register(form.username, form.password, form.nickname);
      navigate('/couple-setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>회원가입</h1>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <CheckField
            label="아이디"
            id="username"
            name="username"
            value={form.username}
            onChange={onChange}
            onCheck={checkUsername}
            check={usernameCheck}
            invalidMessage="영문 소문자·숫자·밑줄(_)만 사용해 4~20자로 입력해주세요."
          />
          <CheckField
            label="닉네임"
            id="nickname"
            name="nickname"
            value={form.nickname}
            onChange={onChange}
            onCheck={checkNickname}
            check={nicknameCheck}
            invalidMessage="한글·영문·숫자만 사용해 2~12자로 입력해주세요."
          />
          <div className="field">
            <label htmlFor="password">비밀번호 (8자 이상)</label>
            <PasswordInput
              id="password"
              name="password"
              minLength={8}
              required
              value={form.password}
              onChange={onChange}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? '가입 중...' : '가입하기'}
          </button>
        </form>
        <div className="auth-switch">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
