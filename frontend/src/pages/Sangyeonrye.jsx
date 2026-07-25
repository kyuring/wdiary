import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';
import PlaceSearch from '../components/PlaceSearch.jsx';
import { allRegions, recommendMidpoint } from '../lib/sangyeonrye.js';

function ChecklistBlock({ title, items, answers, onToggle }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <input type="checkbox" checked={!!answers?.[item]} onChange={(e) => onToggle(item, e.target.checked)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sangyeonrye() {
  const [data, setData] = useState(null);
  const regionGroups = useGuideContent('sangyeonrye.region_groups');
  const midpointPairs = useGuideContent('sangyeonrye.midpoint_pairs');
  const generalGuide = useGuideContent('sangyeonrye.general_guide');
  const preMeetingChecklist = useGuideContent('sangyeonrye.pre_meeting_checklist');
  const dayOfChecklist = useGuideContent('sangyeonrye.day_of_checklist');
  const cuisineOptions = useGuideContent('sangyeonrye.cuisine_options');
  const [error, setError] = useState('');
  const [groomRegion, setGroomRegion] = useState('');
  const [brideRegion, setBrideRegion] = useState('');
  const [decidedPlace, setDecidedPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = () =>
    api.get('/sangyeonrye').then((res) => {
      setData(res.sangyeonrye || {});
      setGroomRegion(res.sangyeonrye?.groom_region || '');
      setBrideRegion(res.sangyeonrye?.bride_region || '');
      setDecidedPlace(res.sangyeonrye?.decided_place || '');
      setNotes(res.sangyeonrye?.notes || '');
    });

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  const patch = async (fields) => {
    setError('');
    try {
      const result = await api.patch('/sangyeonrye', fields);
      setData(result.sangyeonrye);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleChecklist = (field, item, checked) => {
    patch({ [field]: { [item]: checked } });
  };

  if (!data || !regionGroups) return <div className="full-page-center">불러오는 중...</div>;

  const regions = allRegions(regionGroups);
  const recommendation = recommendMidpoint(regionGroups, midpointPairs, groomRegion, brideRegion);

  return (
    <div>
      <h1>상견례</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>지역 선택 & 추천</h2>
        <div className="form-row">
          <div className="field">
            <label>신랑측 지역</label>
            <select
              value={groomRegion}
              onChange={(e) => { setGroomRegion(e.target.value); patch({ groom_region: e.target.value }); }}
            >
              <option value="">선택</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label>신부측 지역</label>
            <select
              value={brideRegion}
              onChange={(e) => { setBrideRegion(e.target.value); patch({ bride_region: e.target.value }); }}
            >
              <option value="">선택</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {recommendation && (
          <p style={{ marginTop: 8 }}>
            <span className="badge badge-success">{recommendation}</span>
          </p>
        )}
      </div>

      <div className="card">
        <h2>장소 찾기</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 10 }}>
          음식 종류를 고르면 위 추천 지역 기준으로 검색어를 채워드려요. 실제 예산·분위기는 직접 확인해보세요.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {(cuisineOptions || []).map((c) => (
            <button
              key={c}
              type="button"
              className="btn-ghost"
              onClick={() => setSearchQuery(`${brideRegion || groomRegion || ''} ${c}`.trim())}
            >
              {c}
            </button>
          ))}
        </div>
        <PlaceSearch key={searchQuery} defaultQuery={searchQuery} />
      </div>

      <div className="card">
        <h2>확정 장소 & 메모</h2>
        <div className="field">
          <label>확정 장소</label>
          <input
            value={decidedPlace}
            onChange={(e) => setDecidedPlace(e.target.value)}
            onBlur={() => patch({ decided_place: decidedPlace })}
          />
        </div>
        <div className="field">
          <label>메모</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => patch({ notes })}
            placeholder="예산대, 인원수, 예약 시간 등 자유롭게 메모하세요"
          />
        </div>
      </div>

      {generalGuide && (
        <div className="card">
          <h2>일반 가이드</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {generalGuide.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>
      )}

      {preMeetingChecklist && (
        <ChecklistBlock
          title="상견례 전 체크리스트"
          items={preMeetingChecklist}
          answers={data.pre_meeting_checklist}
          onToggle={(item, checked) => toggleChecklist('pre_meeting_checklist', item, checked)}
        />
      )}
      {dayOfChecklist && (
        <ChecklistBlock
          title="상견례 당일 체크리스트"
          items={dayOfChecklist}
          answers={data.day_of_checklist}
          onToggle={(item, checked) => toggleChecklist('day_of_checklist', item, checked)}
        />
      )}
    </div>
  );
}
