import { useEffect, useState } from 'react';
import MoneyInput from '../../components/MoneyInput.jsx';
import PlaceSearch from '../../components/PlaceSearch.jsx';

function StayRow({ stay, onUpdate, onDelete }) {
  const [destination, setDestination] = useState(stay.destination);
  const [hotelName, setHotelName] = useState(stay.hotel_name || '');
  const [price, setPrice] = useState(stay.price ?? '');
  const [nights, setNights] = useState(stay.nights ?? '');
  const [showAttractions, setShowAttractions] = useState(false);

  useEffect(() => setDestination(stay.destination), [stay.destination]);
  useEffect(() => setHotelName(stay.hotel_name || ''), [stay.hotel_name]);
  useEffect(() => setPrice(stay.price ?? ''), [stay.price]);
  useEffect(() => setNights(stay.nights ?? ''), [stay.nights]);

  return (
    <>
      <tr style={{ borderTop: '1px solid var(--border)' }}>
        <td style={{ padding: 8 }}>
          <input style={{ width: 90 }} value={destination} onChange={(e) => setDestination(e.target.value)} onBlur={() => destination !== stay.destination && onUpdate(stay, { destination })} />
        </td>
        <td style={{ padding: 8 }}>
          <input value={hotelName} onChange={(e) => setHotelName(e.target.value)} onBlur={() => hotelName !== (stay.hotel_name || '') && onUpdate(stay, { hotel_name: hotelName })} placeholder="숙소명" />
        </td>
        <td style={{ padding: 8, minWidth: 130 }}>
          <MoneyInput value={price} onChange={setPrice} onBlurCommit={() => Number(price || 0) !== Number(stay.price || 0) && onUpdate(stay, { price: price === '' ? null : Number(price) })} />
        </td>
        <td style={{ padding: 8 }}>
          <input type="number" min="0" style={{ width: 60 }} value={nights} onChange={(e) => setNights(e.target.value)} onBlur={() => Number(nights || 0) !== Number(stay.nights || 0) && onUpdate(stay, { nights: nights === '' ? null : Number(nights) })} />
        </td>
        <td style={{ padding: 8 }}>
          <button className="btn-ghost" onClick={() => setShowAttractions((v) => !v)}>관광지</button>
        </td>
        <td style={{ padding: 8 }}>
          <button className="btn-ghost" onClick={() => onDelete(stay)}>삭제</button>
        </td>
      </tr>
      {showAttractions && (
        <tr>
          <td colSpan={6} style={{ padding: '8px 8px 16px', width: 0 }}>
            <div style={{ width: 0, minWidth: '100%' }}>
              <PlaceSearch defaultQuery={`${stay.destination} 관광명소`} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function StaysSection({ stays, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ destination: '' });

  const addStay = async (e) => {
    e.preventDefault();
    if (!form.destination) return;
    await onAdd(form);
    setForm({ destination: '' });
  };

  return (
    <div className="card">
      <h2>숙소</h2>
      {stays.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: 8 }}>목적지</th>
                <th style={{ padding: 8 }}>숙소명</th>
                <th style={{ padding: 8 }}>금액</th>
                <th style={{ padding: 8 }}>박수</th>
                <th style={{ padding: 8 }}></th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {stays.map((s) => (
                <StayRow key={s.id} stay={s} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={addStay} className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>목적지</label>
          <input value={form.destination} onChange={(e) => setForm({ destination: e.target.value })} />
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn-secondary" type="submit">숙소 추가</button>
        </div>
      </form>
    </div>
  );
}
