import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import PlaceSearch from '../components/PlaceSearch.jsx';

function won(n) {
  if (n == null || n === '') return '-';
  return `${Number(n).toLocaleString()}원`;
}

function ChecklistField({ label, value, onSave }) {
  const [text, setText] = useState(value || '');
  useEffect(() => setText(value || ''), [value]);
  return (
    <div className="field" style={{ marginBottom: 8 }}>
      <label style={{ fontSize: '0.82rem' }}>{label}</label>
      <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== (value || '') && onSave(label, text)} />
    </div>
  );
}

function VendorCard({ vendor, checklists, commonChecklist, contractStatusOptions, onUpdate, onDelete }) {
  const [name, setName] = useState(vendor.name);
  const [contact, setContact] = useState(vendor.contact || '');
  const [price, setPrice] = useState(vendor.price ?? '');
  const [notes, setNotes] = useState(vendor.notes || '');

  useEffect(() => setName(vendor.name), [vendor.name]);
  useEffect(() => setContact(vendor.contact || ''), [vendor.contact]);
  useEffect(() => setPrice(vendor.price ?? ''), [vendor.price]);
  useEffect(() => setNotes(vendor.notes || ''), [vendor.notes]);

  const categoryChecklist = checklists?.[vendor.category];
  const checklistItems = [...(categoryChecklist || []), ...(categoryChecklist ? (commonChecklist || []) : [])];
  const saveCheck = (key, val) => onUpdate(vendor, { checklist_answers: { [key]: val } });

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        {vendor.name}{' '}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {vendor.contract_status} {vendor.price != null && `· ${won(vendor.price)}`}
        </span>
      </summary>

      <div className="form-row" style={{ marginTop: 16 }}>
        <div className="field">
          <label>업체명</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== vendor.name && onUpdate(vendor, { name })} />
        </div>
        <div className="field">
          <label>연락처</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} onBlur={() => contact !== (vendor.contact || '') && onUpdate(vendor, { contact })} />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>계약 상태</label>
          <select value={vendor.contract_status} onChange={(e) => onUpdate(vendor, { contract_status: e.target.value })}>
            {(contractStatusOptions || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>금액</label>
          <MoneyInput value={price} onChange={setPrice} onBlurCommit={() => Number(price || 0) !== Number(vendor.price || 0) && onUpdate(vendor, { price: price === '' ? null : Number(price) })} />
        </div>
      </div>

      <div className="field">
        <label>메모</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (vendor.notes || '') && onUpdate(vendor, { notes })} />
      </div>

      {checklistItems.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>상담 체크리스트</summary>
          <div style={{ marginTop: 10 }}>
            {checklistItems.map((item) => (
              <ChecklistField key={item} label={item} value={vendor.checklist_answers?.[item]} onSave={saveCheck} />
            ))}
          </div>
        </details>
      )}

      <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => onDelete(vendor)}>업체 삭제</button>
    </details>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState(null);
  const categories = useGuideContent('vendor.categories');
  const contractStatusOptions = useGuideContent('vendor.contract_status_options');
  const checklists = useGuideContent('vendor.checklist');
  const commonChecklist = useGuideContent('vendor.common_checklist');
  const [error, setError] = useState('');
  const [newVendor, setNewVendor] = useState({ category: '', name: '' });
  const [addingVendor, setAddingVendor] = useState(false);

  useEffect(() => {
    api.get('/vendors').then((res) => setVendors(res.vendors)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (categories && !newVendor.category) setNewVendor((prev) => ({ ...prev, category: categories[0] }));
  }, [categories]);

  const addVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.name.trim() || addingVendor) return;
    setAddingVendor(true);
    try {
      const result = await api.post('/vendors', { category: newVendor.category, name: newVendor.name.trim() });
      setVendors((prev) => [...prev, result.vendor]);
      setNewVendor({ ...newVendor, name: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingVendor(false);
    }
  };

  const updateVendor = async (vendor, fields) => {
    try {
      const result = await api.patch(`/vendors/${vendor.id}`, fields);
      setVendors((prev) => prev.map((v) => (v.id === vendor.id ? result.vendor : v)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteVendor = async (vendor) => {
    await api.delete(`/vendors/${vendor.id}`);
    setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
  };

  if (!vendors || !categories) return <div className="full-page-center">불러오는 중...</div>;

  const grouped = categories.map((cat) => [cat, vendors.filter((v) => v.category === cat)]).filter(([, list]) => list.length > 0);

  return (
    <div>
      <h1>업체 컨택 관리</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>업체 찾기</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 10 }}>
          예: "홍대 웨딩스튜디오", "강남 드레스샵"처럼 지역+종류로 검색해보세요.
        </p>
        <PlaceSearch />
      </div>

      {grouped.map(([category, list]) => (
        <div key={category} className="card">
          <h2>{category}</h2>
          {list.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              checklists={checklists}
              commonChecklist={commonChecklist}
              contractStatusOptions={contractStatusOptions}
              onUpdate={updateVendor}
              onDelete={deleteVendor}
            />
          ))}
        </div>
      ))}

      <div className="card">
        <h2>업체 추가</h2>
        <form onSubmit={addVendor} className="form-row">
          <div className="field">
            <label>카테고리</label>
            <select value={newVendor.category} onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>업체명</label>
            <input value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-primary" type="submit" disabled={addingVendor}>
              {addingVendor ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
