import { useState } from 'react';
import Modal from '../../components/Modal.jsx';

export default function WeddingInfoModal({ couple, onClose, onSave }) {
  const [form, setForm] = useState({
    wedding_date: couple.wedding_date || '',
    wedding_time: couple.wedding_time?.slice(0, 5) || '',
    groom_name: couple.groom_name || '',
    bride_name: couple.bride_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({ ...form, wedding_time: form.wedding_time || null });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="결혼식 정보" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="groom_name">신랑 이름</label>
            <input
              id="groom_name"
              value={form.groom_name}
              onChange={(e) => setForm({ ...form, groom_name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="bride_name">신부 이름</label>
            <input
              id="bride_name"
              value={form.bride_name}
              onChange={(e) => setForm({ ...form, bride_name: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="wedding_date">결혼식 날짜</label>
            <input
              id="wedding_date"
              type="date"
              value={form.wedding_date}
              onChange={(e) => setForm({ ...form, wedding_date: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="wedding_time">예식 시간</label>
            <input
              id="wedding_time"
              type="time"
              value={form.wedding_time}
              onChange={(e) => setForm({ ...form, wedding_time: e.target.value })}
            />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </Modal>
  );
}
