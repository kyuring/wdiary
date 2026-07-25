import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const SECTION_LABELS = {
  'venue.checklist': '웨딩홀 체크리스트',
  'vendor.categories': '업체 카테고리',
  'vendor.contract_status_options': '업체 계약 상태 옵션',
  'vendor.checklist': '업체별 상담 체크리스트',
  'vendor.common_checklist': '업체 공통 체크리스트',
  'style.recommendations': '스타일 추천(드레스·부케·음악)',
  'sangyeonrye.region_groups': '상견례 권역 그룹',
  'sangyeonrye.midpoint_pairs': '상견례 중간지점 추천',
  'sangyeonrye.general_guide': '상견례 일반 가이드',
  'sangyeonrye.pre_meeting_checklist': '상견례 전 체크리스트',
  'sangyeonrye.day_of_checklist': '상견례 당일 체크리스트',
  'sangyeonrye.cuisine_options': '상견례 음식 종류',
  'honeymoon.destinations': '신혼여행 목적지 정보',
  'roadmap.phases': '준비 타임라인 단계',
  'roadmap.venue_lead_time': '웨딩홀 예약 리드타임',
  'roadmap.journey_milestones': '준비 여정 마일스톤',
  'budget.categories': '예산 카테고리',
  'budget.line_item_defaults': '예산 세부항목 기본값',
  'budget.presets': '예산 배분 비율 프리셋',
  'checklist.defaults': '체크리스트 기본 항목',
  'weddingday.mc_script_examples': '사회자 멘트 예시',
  'weddingday.vows_examples': '혼인서약서 예시',
};

// section_key의 접두사(점 앞부분)로 묶어서 카테고리별 카드로 분리 — 21개를 한 줄로 쭉 늘어놓지 않기 위함
const GROUP_LABELS = {
  venue: '웨딩홀',
  vendor: '업체',
  style: '스타일',
  sangyeonrye: '상견례',
  honeymoon: '신혼여행',
  roadmap: '로드맵',
  budget: '예산',
  checklist: '체크리스트',
  weddingday: '예식 당일',
};
const GROUP_ORDER = Object.keys(GROUP_LABELS);

function groupOf(sectionKey) {
  return sectionKey.split('.')[0];
}

function SectionEditor({ item, editingKey, draft, saveError, onStartEdit, onCancel, onDraftChange, onSave }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{SECTION_LABELS[item.section_key] || item.section_key}</span>
        {editingKey === item.section_key ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => onSave(item)}>저장</button>
            <button className="btn-ghost" onClick={onCancel}>취소</button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => onStartEdit(item)}>수정</button>
        )}
      </div>
      {editingKey === item.section_key && (
        <div style={{ marginTop: 8 }}>
          {saveError && <div className="error-banner">{saveError}</div>}
          <textarea
            rows={12}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminGuideContent() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.get('/guide-content').then((res) => setItems(res.items)).catch((err) => setError(err.message));
  }, []);

  const startEdit = (item) => {
    setEditingKey(item.section_key);
    setDraft(JSON.stringify(item.content, null, 2));
    setSaveError('');
  };

  const save = async (item) => {
    setSaveError('');
    let parsed;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setSaveError('JSON 형식이 올바르지 않아요.');
      return;
    }
    try {
      const result = await api.put(`/guide-content/${item.section_key}`, {
        content_type: item.content_type,
        content: parsed,
      });
      setItems((prev) => prev.map((i) => (i.section_key === item.section_key ? result.item : i)));
      setEditingKey(null);
    } catch (err) {
      setSaveError(err.message);
    }
  };

  if (error) return <div className="card"><div className="error-banner">{error}</div></div>;

  return (
    <div>
      <h1>가이드 콘텐츠 관리</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
        웨딩홀·업체·스타일·상견례·신혼여행·로드맵·예산·체크리스트 등 앱 전반에서 쓰이는 가이드 콘텐츠예요. 카테고리를 펼쳐서 필요한 항목만 골라 수정하세요. JSON 형식을 그대로 편집합니다.
      </p>
      {!items ? (
        <p>불러오는 중...</p>
      ) : (
        GROUP_ORDER.map((group) => {
          const groupItems = items.filter((item) => groupOf(item.section_key) === group);
          if (groupItems.length === 0) return null;
          return (
            <details key={group} className="card">
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1.05rem' }}>
                {GROUP_LABELS[group]}{' '}
                <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>({groupItems.length}개)</span>
              </summary>
              <div style={{ marginTop: 8 }}>
                {groupItems.map((item) => (
                  <SectionEditor
                    key={item.section_key}
                    item={item}
                    editingKey={editingKey}
                    draft={draft}
                    saveError={saveError}
                    onStartEdit={startEdit}
                    onCancel={() => setEditingKey(null)}
                    onDraftChange={setDraft}
                    onSave={save}
                  />
                ))}
              </div>
            </details>
          );
        })
      )}
    </div>
  );
}
