import { won, STATUS_LABELS } from './helpers.js';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// 예식 후 "진짜 얼마 썼는지" 정산용 리포트. 완료(status='done') 처리된 항목만 확정 지출로 집계하고,
// 아직 완료 처리 안 된 항목은 별도로 모아서 "정산 남은 항목"으로 보여줌(깜빡하고 안 챙긴 계약금·잔금 확인용).
export default function SettlementReport({ weddingDate, totals, categories, targetByCategory, lineItems }) {
  const dday = daysUntil(weddingDate);
  const isBeforeWedding = dday != null && dday > 0;

  const pendingItems = lineItems.filter((i) => !i.excluded_from_budget && i.status !== 'done' && i.total_amount > 0);
  const pendingTotal = pendingItems.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  const target = totals.targetTotal;
  const diffVsTarget = target != null ? target - totals.actualSpentTotal : null;

  return (
    <div>
      {weddingDate && isBeforeWedding && (
        <div className="card" style={{ background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-strong)' }}>
            아직 예식(D-{dday}) 전이에요. 완료 처리된 항목만 집계되니, 지금은 참고용으로만 봐주세요.
          </p>
        </div>
      )}

      <div className="card">
        <h2>실제 지출 현황(완료 처리 항목만)</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8, fontSize: '0.9rem' }}>
          <span>목표(전체 계획 예산): <strong>{target != null ? won(target) : '미설정'}</strong></span>
          <span>확정 지출(완료 항목 합계): <strong>{won(totals.actualSpentTotal)}</strong></span>
          {diffVsTarget != null && (
            <span>
              목표 대비: <strong style={{ color: diffVsTarget < 0 ? 'var(--danger)' : 'var(--success)' }}>
                {diffVsTarget < 0 ? `${won(-diffVsTarget)} 초과` : `${won(diffVsTarget)} 절감`}
              </strong>
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>카테고리별 확정 지출</h2>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: 8 }}>카테고리</th>
                <th style={{ padding: 8 }}>목표</th>
                <th style={{ padding: 8 }}>확정 지출</th>
                <th style={{ padding: 8 }}>차이</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const target = targetByCategory.get(c.name) || 0;
                const diff = target - c.actualSpent;
                return (
                  <tr key={c.name} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{c.name}</td>
                    <td style={{ padding: 8 }}>{won(target)}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>{won(c.actualSpent)}</td>
                    <td style={{ padding: 8, color: diff < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {diff < 0 ? `${won(-diff)} 초과` : `${won(diff)} 절감`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>아직 완료 처리 안 된 항목 {pendingItems.length > 0 && `(${pendingItems.length}건, 합계 ${won(pendingTotal)})`}</h2>
        {pendingItems.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>모든 항목이 완료 처리됐어요.</p>
        ) : (
          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
            {pendingItems.map((i) => (
              <li key={i.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span>{i.category} · {i.item_name}{i.vendor_name && ` · ${i.vendor_name}`}</span>
                <span>
                  <span className="badge badge-warn" style={{ marginRight: 8 }}>{STATUS_LABELS[i.status]}</span>
                  {won(i.total_amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
