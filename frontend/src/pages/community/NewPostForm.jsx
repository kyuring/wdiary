import { useState } from 'react';
import { api } from '../../api/client.js';
import { StarRatingInput } from '../../components/StarRating.jsx';
import { CATEGORIES } from './helpers.js';

export default function NewPostForm({ onCreated, onClose }) {
  const [form, setForm] = useState({ category: CATEGORIES[0], region: '', place_name: '', rating: '', title: '', body: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const needsPlace = form.category === '웨딩홀후기' || form.category === '상견례장소';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post('/community/posts', {
        ...form,
        region: form.region || null,
        place_name: form.place_name || null,
        rating: form.rating ? Number(form.rating) : null,
      });
      onCreated(result.post);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>글쓰기</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label>카테고리</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {needsPlace && (
            <>
              <div className="field">
                <label>지역</label>
                <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="예: 서울 강남" />
              </div>
              <div className="field">
                <label>장소명</label>
                <input value={form.place_name} onChange={(e) => setForm({ ...form, place_name: e.target.value })} />
              </div>
              <div className="field" style={{ minWidth: 'auto' }}>
                <label>평점</label>
                <StarRatingInput value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
              </div>
            </>
          )}
        </div>
        <div className="field">
          <label>제목</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>본문</label>
          <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '등록'}
          </button>
          <button className="btn-ghost" type="button" onClick={onClose}>취소</button>
        </div>
      </form>
    </div>
  );
}
