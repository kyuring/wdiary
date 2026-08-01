import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import MoneyInput from '../../components/MoneyInput.jsx';
import Modal from '../../components/Modal.jsx';
import { DAY_TYPE_LABELS } from '../../lib/roadmap.js';
import { won } from './helpers.js';

const SOURCE_LABELS = { mine: '내가 받은 견적', reference: '지인 참고 견적' };

const QUOTE_FIELDS = [
  'source', 'hall_name', 'quote_date', 'day_type', 'time_slot', 'rental_fee', 'meal_price',
  'guaranteed_headcount', 'drinks_included', 'contract_day_benefit', 'total_price',
];

const BLANK_FORM = { ...Object.fromEntries(QUOTE_FIELDS.map((f) => [f, ''])), source: 'mine' };

function QuoteForm({ initial, onSubmit, secondaryLabel, onSecondary, submitting }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      source: form.source || 'mine',
      hall_name: form.hall_name || null,
      quote_date: form.quote_date || null,
      day_type: form.day_type || null,
      time_slot: form.time_slot || null,
      rental_fee: form.rental_fee === '' ? null : Number(form.rental_fee),
      meal_price: form.meal_price === '' ? null : Number(form.meal_price),
      guaranteed_headcount: form.guaranteed_headcount === '' ? null : Number(form.guaranteed_headcount),
      drinks_included: form.drinks_included || null,
      contract_day_benefit: form.contract_day_benefit || null,
      total_price: form.total_price === '' ? null : Number(form.total_price),
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>이 견적은</label>
        <select value={form.source || 'mine'} onChange={(e) => set('source')(e.target.value)}>
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <div className="field">
          <label>홀명</label>
          <input value={form.hall_name} onChange={(e) => set('hall_name')(e.target.value)} />
        </div>
        <div className="field">
          <label>날짜</label>
          <input type="date" value={form.quote_date} onChange={(e) => set('quote_date')(e.target.value)} />
        </div>
        <div className="field">
          <label>요일</label>
          <select value={form.day_type} onChange={(e) => set('day_type')(e.target.value)}>
            <option value="">선택 안 함</option>
            {Object.entries(DAY_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>시간대</label>
          <input placeholder="예: 12:30" value={form.time_slot} onChange={(e) => set('time_slot')(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>대관료</label>
          <MoneyInput value={form.rental_fee} onChange={set('rental_fee')} />
        </div>
        <div className="field">
          <label>식대(1인 기준)</label>
          <MoneyInput value={form.meal_price} onChange={set('meal_price')} />
        </div>
        <div className="field">
          <label>보증 인원</label>
          <input type="number" min="0" value={form.guaranteed_headcount} onChange={(e) => set('guaranteed_headcount')(e.target.value)} />
        </div>
        <div className="field">
          <label>총금액</label>
          <MoneyInput value={form.total_price} onChange={set('total_price')} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>음료·주류 포함 유무</label>
          <input placeholder="예: 음료만 포함, 주류는 별도" value={form.drinks_included} onChange={(e) => set('drinks_included')(e.target.value)} />
        </div>
        <div className="field">
          <label>당일계약 혜택</label>
          <input placeholder="예: 당일 계약 시 200만원 할인" value={form.contract_day_benefit} onChange={(e) => set('contract_day_benefit')(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        {onSecondary && <button type="button" className="btn-ghost" onClick={onSecondary}>{secondaryLabel}</button>}
        <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? '저장 중...' : '저장'}</button>
      </div>
    </form>
  );
}

function QuoteItem({ quote: q, venue, editingId, setEditingId, updateQuote, deleteQuote, submitting }) {
  return (
    <li style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {q.hall_name || venue.name}
          {q.quote_date && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {q.quote_date}{q.day_type && ` (${DAY_TYPE_LABELS[q.day_type]})`}{q.time_slot && ` ${q.time_slot}`}</span>}
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 6px' }} onClick={() => setEditingId(q.id)}>수정</button>
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 6px' }} onClick={() => deleteQuote(q.id)}>삭제</button>
        </span>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        대관료 {won(q.rental_fee)} · 식대 {won(q.meal_price)} · 보증인원 {q.guaranteed_headcount ?? '-'}명
        {q.drinks_included && ` · ${q.drinks_included}`}
        {q.contract_day_benefit && ` · ${q.contract_day_benefit}`}
      </p>
      {q.total_price != null && (
        <p style={{ margin: '2px 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-strong)' }}>총금액 {won(q.total_price)}</p>
      )}
      {editingId === q.id && (
        <div style={{ marginTop: 10 }}>
          <QuoteForm
            initial={Object.fromEntries(QUOTE_FIELDS.map((f) => [f, q[f] ?? '']))}
            onSubmit={(payload) => updateQuote(q.id, payload)}
            secondaryLabel="취소"
            onSecondary={() => setEditingId(null)}
            submitting={submitting}
          />
        </div>
      )}
    </li>
  );
}

function QuoteGroup({ title, quotes, ...itemProps }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: '0.88rem', marginBottom: 4, color: 'var(--text-muted)' }}>{title}</h3>
      {quotes.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>아직 없어요.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {quotes.map((q) => <QuoteItem key={q.id} quote={q} {...itemProps} />)}
        </ul>
      )}
    </div>
  );
}

export default function ReferenceQuoteModal({ venue, onClose }) {
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // null = "새 견적 추가" 폼, 그 외엔 해당 id 견적 수정 중
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/venues/${venue.id}/reference-quotes`).then((res) => setQuotes(res.quotes)).catch((err) => setError(err.message));
  }, [venue.id]);

  const addQuote = async (payload) => {
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post(`/venues/${venue.id}/reference-quotes`, payload);
      setQuotes((prev) => [...prev, result.quote]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateQuote = async (id, payload) => {
    setSubmitting(true);
    setError('');
    try {
      const result = await api.patch(`/venues/${venue.id}/reference-quotes/${id}`, payload);
      setQuotes((prev) => prev.map((q) => (q.id === id ? result.quote : q)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteQuote = async (id) => {
    try {
      await api.delete(`/venues/${venue.id}/reference-quotes/${id}`);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const itemProps = { venue, editingId, setEditingId, updateQuote, deleteQuote, submitting };

  return (
    <Modal title={`견적 — ${venue.name}`} onClose={onClose} maxWidth="700px">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: -8, marginBottom: 12 }}>
        같은 웨딩홀이라도 홀·날짜·시간대별로 견적이 다르면 각각 따로 등록해서 비교하세요.
      </p>
      {error && <div className="error-banner">{error}</div>}

      {quotes === null ? (
        <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
      ) : (
        <>
          <QuoteGroup title="내가 받은 견적" quotes={quotes.filter((q) => q.source !== 'reference')} {...itemProps} />
          <QuoteGroup title="지인 참고 견적" quotes={quotes.filter((q) => q.source === 'reference')} {...itemProps} />
        </>
      )}

      {editingId === null && (
        <>
          <h3 style={{ fontSize: '0.9rem', marginBottom: 8 }}>+ 새 견적 추가</h3>
          <QuoteForm
            key={quotes?.length ?? 0}
            initial={BLANK_FORM}
            onSubmit={addQuote}
            secondaryLabel="닫기"
            onSecondary={onClose}
            submitting={submitting}
          />
        </>
      )}
    </Modal>
  );
}
