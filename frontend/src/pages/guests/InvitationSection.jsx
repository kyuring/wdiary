import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function InvitationSection() {
  const [invitation, setInvitation] = useState(null);
  const [designUrl, setDesignUrl] = useState('');
  const [sentDate, setSentDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/invitation').then((res) => {
      setInvitation(res.invitation || {});
      setDesignUrl(res.invitation?.design_url || '');
      setSentDate(res.invitation?.sent_date || '');
    }).catch((err) => setError(err.message));
  }, []);

  const patch = async (fields) => {
    setError('');
    try {
      const result = await api.patch('/invitation', fields);
      setInvitation(result.invitation);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!invitation) return null;

  return (
    <div className="card">
      <h2>청첩장</h2>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-row">
        <div className="field">
          <label>모바일 청첩장 링크</label>
          <input value={designUrl} onChange={(e) => setDesignUrl(e.target.value)} onBlur={() => patch({ design_url: designUrl })} placeholder="https://..." />
        </div>
        <div className="field">
          <label>발송일</label>
          <input type="date" value={sentDate || ''} onChange={(e) => { setSentDate(e.target.value); patch({ sent_date: e.target.value || null }); }} />
        </div>
      </div>
      {invitation.sent_date && <p><span className="badge badge-success">✓ 발송 완료 ({invitation.sent_date})</span></p>}
    </div>
  );
}
