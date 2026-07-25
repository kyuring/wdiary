import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useGuideContent } from '../../context/GuideContentContext.jsx';

export default function VowsSection() {
  const [vows, setVows] = useState(null);
  const [groom, setGroom] = useState('');
  const [bride, setBride] = useState('');
  const [error, setError] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const examples = useGuideContent('weddingday.vows_examples');

  useEffect(() => {
    api.get('/wedding-day/vows').then((res) => {
      setVows(res.vows || {});
      setGroom(res.vows?.vows_groom || '');
      setBride(res.vows?.vows_bride || '');
    }).catch((err) => setError(err.message));
  }, []);

  const patch = async (fields) => {
    setError('');
    try {
      const result = await api.patch('/wedding-day/vows', fields);
      setVows(result.vows);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!vows) return null;

  return (
    <div className="card">
      <h2>혼인서약서</h2>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-row">
        <div className="field">
          <label>신랑 서약</label>
          <textarea
            rows={6}
            value={groom}
            onChange={(e) => setGroom(e.target.value)}
            onBlur={() => patch({ vows_groom: groom })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <div className="field">
          <label>신부 서약</label>
          <textarea
            rows={6}
            value={bride}
            onChange={(e) => setBride(e.target.value)}
            onBlur={() => patch({ vows_bride: bride })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
      </div>

      <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setShowExamples((v) => !v)}>
        {showExamples ? '예시 닫기' : '예시 보기'}
      </button>
      {showExamples && examples && (
        <div style={{ marginTop: 12 }}>
          {examples.map((ex) => (
            <div key={ex.title} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ex.title}</p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>{ex.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
