import { useEffect, useState } from 'react';
import MoneyInput from '../../components/MoneyInput.jsx';
import { won, recommendedFor, PRESET_LABELS } from './helpers.js';

// 전체 계획 예산을 카테고리별로 어떻게 나눌지 참고용 배분표. 권장 금액은 프리셋 비율로 자동 계산되지만
// 직접 고쳐서 이 카테고리만 다른 금액으로 덮어쓸 수 있음(couple별로 저장됨). 여러 칸을 고치는 동안은
// 로컬에서만 바뀌고, "변경사항 저장"을 눌러야 한 번에 반영됨 — 그 사이 "여유분"(목표 - 권장 합계)이 실시간으로 보임.
export default function AllocationGuide({ target, presets, preset, onPresetChange, categories, categoryTargets, onSaveTargets, summaryByCategory }) {
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  const ratios = (presets && presets[preset]) || {};
  const targetNum = Number(target) || 0;

  useEffect(() => {
    setDrafts({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, target]);

  if (!presets) return null;

  const draftFor = (category) => {
    if (drafts[category] !== undefined) return drafts[category];
    return recommendedFor(category, targetNum, ratios, categoryTargets);
  };

  const totalDraft = categories.reduce((sum, c) => sum + Number(draftFor(c) || 0), 0);
  const leftover = targetNum - totalDraft;
  const leftoverPercent = targetNum > 0 ? Math.round((leftover / targetNum) * 100) : 0;
  const hasChanges = Object.keys(drafts).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const nextTargets = { ...(categoryTargets || {}) };
      for (const [category, value] of Object.entries(drafts)) {
        const ratioDefault = Math.round(targetNum * (ratios[category] || 0));
        if (Number(value) === ratioDefault) delete nextTargets[category];
        else nextTargets[category] = Number(value);
      }
      await onSaveTargets(nextTargets);
      setDrafts({});
    } finally {
      setSaving(false);
    }
  };

  const resetOne = (category) => {
    setDrafts((prev) => ({ ...prev, [category]: Math.round(targetNum * (ratios[category] || 0)) }));
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>카테고리별 예산 배분 참고</h2>
        <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
          {Object.keys(presets).map((key) => (
            <option key={key} value={key}>{PRESET_LABELS[key] || key}</option>
          ))}
        </select>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
        통계가 아니라 출발점 참고용 비율이에요. "권장 금액"은 직접 고쳐서 이 카테고리만 다른 금액으로 정할 수 있어요. 여러 칸을 고친 뒤 "변경사항 저장"을 눌러야 반영돼요. 실제 세부항목 배분은 각 카테고리 탭에서 하세요.
      </p>
      {targetNum <= 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>전체 계획 예산을 먼저 입력해주세요.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: '0.85rem', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 8 }}>카테고리</th>
                  <th style={{ padding: 8 }}>비율</th>
                  <th style={{ padding: 8 }}>금액</th>
                  <th style={{ padding: 8 }}>실제 사용액</th>
                  <th style={{ padding: 8 }}>차이</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const draftValue = draftFor(category);
                  const livePercent = targetNum > 0 ? Math.round((Number(draftValue || 0) / targetNum) * 100) : 0;
                  const isOverride = categoryTargets?.[category] != null || drafts[category] !== undefined;
                  const current = summaryByCategory.get(category)?.spent || 0;
                  const diff = current - draftValue;
                  return (
                    <tr key={category} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category}</td>
                      <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{livePercent}%</td>
                      <td style={{ padding: 8 }}>
                        <MoneyInput value={draftValue} onChange={(v) => setDrafts((prev) => ({ ...prev, [category]: Number(v || 0) }))} />
                        {isOverride && (
                          <button
                            className="btn-ghost"
                            style={{ display: 'block', marginLeft: 'auto', marginTop: 2, fontSize: '0.9rem', lineHeight: 1, padding: '0 4px', color: 'var(--text-muted)' }}
                            onClick={() => resetOne(category)}
                            title="초기화"
                          >
                            ↺
                          </button>
                        )}
                      </td>
                      <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{won(current)}</td>
                      <td style={{ padding: 8, whiteSpace: 'nowrap', color: diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--text-muted)' : 'inherit' }}>
                        {diff > 0 ? `+${won(diff)}` : diff < 0 ? `-${won(-diff)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 600 }}>
                  <td style={{ padding: 8 }}>여유분</td>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{leftoverPercent}%</td>
                  <td style={{ padding: 8, color: leftover < 0 ? 'var(--danger)' : 'var(--success)' }} colSpan={3}>
                    {won(leftover)} {leftover < 0 && '(권장 금액 합계가 목표를 초과했어요)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={save} disabled={!hasChanges || saving}>
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </>
      )}
    </div>
  );
}
