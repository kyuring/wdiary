import { useState } from 'react';

export default function PasswordInput({ id, name, value, onChange, required, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        tabIndex={-1}
      >
        {visible ? '숨기기' : '보기'}
      </button>
    </div>
  );
}
