import { useState } from 'react';
import { useGuideContent } from '../../context/GuideContentContext.jsx';

// 로드 길이(m)를 걷는 속도로 나눠 대략적인 입장 소요시간을 추정하는 계산기.
// 실측치가 아니라 "우아하게 걷는 속도" 기준 참고값이라, 실제로는 리허설로 꼭 확인해야 함.
const WALK_PACE_OPTIONS = [
  { key: 'normal', label: '보통 속도', mps: 0.45 },
  { key: 'slow', label: '천천히(일반적인 신부 입장 속도)', mps: 0.3 },
  { key: 'veryslow', label: '아주 천천히(드라마틱하게)', mps: 0.2 },
];

function EntranceSongCalculator() {
  const [aisleLength, setAisleLength] = useState('');
  const [pace, setPace] = useState('slow');
  const [includePause, setIncludePause] = useState(true);

  const paceMps = WALK_PACE_OPTIONS.find((p) => p.key === pace).mps;
  const length = Number(aisleLength);
  const walkSeconds = length > 0 ? length / paceMps : null;
  const pauseBuffer = includePause ? 8 : 0;
  const totalSeconds = walkSeconds != null ? walkSeconds + pauseBuffer : null;
  const recommendedSeconds = totalSeconds != null ? Math.ceil((totalSeconds + 5) / 5) * 5 : null;

  const formatMinSec = (sec) => `${Math.floor(sec / 60)}분 ${Math.round(sec % 60)}초`;

  return (
    <div style={{ marginBottom: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 10 }}>
      <p style={{ fontWeight: 600, margin: '0 0 8px' }}>입장곡 편집 길이 계산기</p>
      <div className="form-row">
        <div className="field" style={{ minWidth: 120 }}>
          <label>버진로드 길이(m)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={aisleLength}
            onChange={(e) => setAisleLength(e.target.value)}
            placeholder="예: 15"
          />
        </div>
        <div className="field">
          <label>걷는 속도</label>
          <select value={pace} onChange={(e) => setPace(e.target.value)}>
            {WALK_PACE_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 'auto', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={includePause} onChange={(e) => setIncludePause(e.target.checked)} />
            중간 포즈(사진) 시간 포함
          </label>
        </div>
      </div>

      {recommendedSeconds != null && (
        <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
          <p style={{ margin: '0 0 4px' }}>예상 입장 시간: 약 {formatMinSec(totalSeconds)} ({Math.round(totalSeconds)}초)</p>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--accent-strong)' }}>
            편집 권장 길이: 약 {recommendedSeconds}초
          </p>
        </div>
      )}
      <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        실측치가 아니라 참고용 추정이에요. 보통 도입부(인트로) 10~15초는 건너뛰고 후렴구·하이라이트 구간 중심으로 편집해서 쓰는 경우가 많아요.
        위 길이를 웨딩홀 음향팀이나 편곡업체에 전달하면 자연스럽게 다듬어줘요. 정확한 시간은 꼭 리허설로 확인하세요.
      </p>
    </div>
  );
}

export default function MCScriptSection({ items, error }) {
  const examples = useGuideContent('weddingday.mc_script_examples');
  const [showExamples, setShowExamples] = useState(false);

  if (!items) return null;
  const mcItems = items.filter((i) => i.is_mc_script);

  return (
    <div className="card">
      <h2>사회자 전달용 큐시트</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>
        예식 진행에 실제로 필요한 항목만 모아 인쇄용으로 정리했어요. 항목 수정은 "전체일정" 탭에서 하면 여기도 같이 바뀌어요.
      </p>
      <p style={{ background: 'var(--accent-bg)', color: 'var(--accent-strong)', fontSize: '0.82rem', padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
        💡 홀의 버진로드 길이에 따라 신부 입장 시간이 달라져요. 입장곡이 너무 길면 어색한 정적이 생길 수 있으니, 리허설 때 실제로 걸어보고 곡 길이를 맞춰(편집) 두는 걸 추천해요.
      </p>
      <EntranceSongCalculator />
      {error && <div className="error-banner">{error}</div>}
      {mcItems.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>사회자용으로 표시된 항목이 없어요. "전체일정" 탭에서 항목별 "사회자용" 체크를 켜주세요.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <th style={{ padding: '8px 10px' }}>시간</th>
                <th style={{ padding: '8px 10px' }}>소요</th>
                <th style={{ padding: '8px 10px' }}>담당</th>
                <th style={{ padding: '8px 10px' }}>순서</th>
                <th style={{ padding: '8px 10px' }}>멘트/대본</th>
              </tr>
            </thead>
            <tbody>
              {mcItems.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--border)', verticalAlign: 'top' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{item.time || '-'}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{item.duration_minutes != null ? `${item.duration_minutes}분` : '-'}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{item.assignee || '-'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.task}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{item.script || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setShowExamples((v) => !v)}>
        {showExamples ? '멘트 예시 닫기' : '멘트 예시 보기'}
      </button>
      {showExamples && examples && (
        <div style={{ marginTop: 12 }}>
          {examples.map((ex) => (
            <div key={ex.step} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>{ex.step}</p>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {ex.examples.map((line, idx) => <li key={idx} style={{ marginBottom: 4 }}>{line}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
