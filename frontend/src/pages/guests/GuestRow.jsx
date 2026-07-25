import { useEffect, useState } from 'react';
import { RSVP_OPTIONS } from './helpers.js';

export default function GuestRow({ guest, onUpdate, onDelete }) {
  const [name, setName] = useState(guest.name);
  const [groupName, setGroupName] = useState(guest.group_name || '');
  const [phone, setPhone] = useState(guest.phone || '');
  const [mealCount, setMealCount] = useState(guest.meal_count ?? 1);

  useEffect(() => setName(guest.name), [guest.name]);
  useEffect(() => setGroupName(guest.group_name || ''), [guest.group_name]);
  useEffect(() => setPhone(guest.phone || ''), [guest.phone]);
  useEffect(() => setMealCount(guest.meal_count ?? 1), [guest.meal_count]);

  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ padding: 8 }}>
        <input style={{ width: 90 }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== guest.name && onUpdate(guest, { name })} />
      </td>
      <td style={{ padding: 8 }}>
        <select value={guest.side || ''} onChange={(e) => onUpdate(guest, { side: e.target.value || null })}>
          <option value="">미지정</option>
          <option value="groom">신랑측</option>
          <option value="bride">신부측</option>
        </select>
      </td>
      <td style={{ padding: 8 }}>
        <input style={{ width: 90 }} value={groupName} onChange={(e) => setGroupName(e.target.value)} onBlur={() => groupName !== (guest.group_name || '') && onUpdate(guest, { group_name: groupName })} placeholder="가족·친구 등" />
      </td>
      <td style={{ padding: 8 }}>
        <input style={{ width: 110 }} value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => phone !== (guest.phone || '') && onUpdate(guest, { phone })} />
      </td>
      <td style={{ padding: 8 }}>
        <select value={guest.rsvp} onChange={(e) => onUpdate(guest, { rsvp: e.target.value })}>
          {RSVP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </td>
      <td style={{ padding: 8 }}>
        <input
          type="number"
          min="0"
          style={{ width: 60 }}
          value={mealCount}
          onChange={(e) => setMealCount(e.target.value)}
          onBlur={() => Number(mealCount) !== Number(guest.meal_count) && onUpdate(guest, { meal_count: Number(mealCount) })}
        />
      </td>
      <td style={{ padding: 8, textAlign: 'center' }}>
        <input type="checkbox" checked={guest.notified} onChange={() => onUpdate(guest, { notified: !guest.notified })} />
      </td>
      <td style={{ padding: 8 }}>
        <button className="btn-ghost" onClick={() => onDelete(guest)}>삭제</button>
      </td>
    </tr>
  );
}
