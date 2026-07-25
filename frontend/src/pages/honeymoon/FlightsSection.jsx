import { useEffect, useState } from 'react';
import MoneyInput from '../../components/MoneyInput.jsx';
import { toDatetimeLocal } from './helpers.js';

function FlightRow({ flight, onUpdate, onDelete }) {
  const [fromPlace, setFromPlace] = useState(flight.from_place);
  const [toPlace, setToPlace] = useState(flight.to_place);
  const [flightNo, setFlightNo] = useState(flight.flight_no || '');
  const [price, setPrice] = useState(flight.price ?? '');

  useEffect(() => setFromPlace(flight.from_place), [flight.from_place]);
  useEffect(() => setToPlace(flight.to_place), [flight.to_place]);
  useEffect(() => setFlightNo(flight.flight_no || ''), [flight.flight_no]);
  useEffect(() => setPrice(flight.price ?? ''), [flight.price]);

  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ padding: 8 }}>
        <input style={{ width: 70 }} value={fromPlace} onChange={(e) => setFromPlace(e.target.value)} onBlur={() => fromPlace !== flight.from_place && onUpdate(flight, { from_place: fromPlace })} />
        {' → '}
        <input style={{ width: 70 }} value={toPlace} onChange={(e) => setToPlace(e.target.value)} onBlur={() => toPlace !== flight.to_place && onUpdate(flight, { to_place: toPlace })} />
      </td>
      <td style={{ padding: 8 }}>
        <input style={{ width: 100 }} value={flightNo} onChange={(e) => setFlightNo(e.target.value)} onBlur={() => flightNo !== (flight.flight_no || '') && onUpdate(flight, { flight_no: flightNo })} placeholder="예: KE901" />
      </td>
      <td style={{ padding: 8, minWidth: 130 }}>
        <MoneyInput value={price} onChange={setPrice} onBlurCommit={() => Number(price || 0) !== Number(flight.price || 0) && onUpdate(flight, { price: price === '' ? null : Number(price) })} />
      </td>
      <td style={{ padding: 8 }}>
        <input
          type="datetime-local"
          value={toDatetimeLocal(flight.departure_at)}
          onChange={(e) => onUpdate(flight, { departure_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
        />
      </td>
      <td style={{ padding: 8 }}>
        <input
          type="datetime-local"
          value={toDatetimeLocal(flight.arrival_at)}
          onChange={(e) => onUpdate(flight, { arrival_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
        />
      </td>
      <td style={{ padding: 8 }}>
        <button className="btn-ghost" onClick={() => onDelete(flight)}>삭제</button>
      </td>
    </tr>
  );
}

export default function FlightsSection({ flights, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ from_place: '', to_place: '' });

  const addFlight = async (e) => {
    e.preventDefault();
    if (!form.from_place || !form.to_place) return;
    await onAdd(form);
    setForm({ from_place: '', to_place: '' });
  };

  return (
    <div className="card">
      <h2>항공편</h2>
      {flights.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: 8 }}>구간</th>
                <th style={{ padding: 8 }}>편명</th>
                <th style={{ padding: 8 }}>금액</th>
                <th style={{ padding: 8 }}>출발시간</th>
                <th style={{ padding: 8 }}>도착시간</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => (
                <FlightRow key={f.id} flight={f} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={addFlight} className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>출발지</label>
          <input value={form.from_place} onChange={(e) => setForm({ ...form, from_place: e.target.value })} />
        </div>
        <div className="field">
          <label>도착지</label>
          <input value={form.to_place} onChange={(e) => setForm({ ...form, to_place: e.target.value })} />
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn-secondary" type="submit">구간 추가</button>
        </div>
      </form>
    </div>
  );
}
