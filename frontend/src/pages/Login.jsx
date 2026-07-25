import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>로그인</h1>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">아이디</label>
            <input id="username" name="username" type="text" required value={form.username} onChange={onChange} />
          </div>
          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <PasswordInput id="password" name="password" required value={form.password} onChange={onChange} />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="auth-switch">
          계정이 없나요? <Link to="/register">회원가입</Link>
        </div>
      </div>
    </div>
  );
}
