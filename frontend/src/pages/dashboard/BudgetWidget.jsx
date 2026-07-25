import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Meter from '../../components/Meter.jsx';
import { api } from '../../api/client.js';
import { useGuideContent } from '../../context/GuideContentContext.jsx';
import { recommendedFor } from '../budget/helpers.js';
import { won, daysUntil } from './helpers.js';

export default function BudgetWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const presets = useGuideContent('budget.presets');

  useEffect(() => {
    api.get('/budget').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="card"><div className="error-banner">{error}</div></div>;
  if (!data) return null;
  if (!data.settings) {
    return (
      <div className="card">
        <h2>예산 요약</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          예산관리에서 총 예산을 입력하면 여기에 요약이 표시돼요.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link to="/budget" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            예산관리로 이동
          </Link>
        </p>
      </div>
    );
  }

  const total = Number(data.settings.total || 0);
  const spent = data.totals.spentTotal;
  const balance = total - spent;
  // 카테고리별 목표는 "요약" 탭과 동일하게 하향식(총예산 × 권장 비율, 평균형 기준)으로 계산 —
  // 대시보드에는 프리셋 선택 UI가 없어서 'average'를 기본값으로 씀
  const ratios = presets?.average || {};
  const categoriesWithTarget = data.categories.map((c) => ({
    ...c,
    target: recommendedFor(c.name, total, ratios, data.settings.category_targets),
  }));
  const categoriesByTarget = [...categoriesWithTarget].sort((a, b) => b.target - a.target);
  const upcoming = data.lineItems
    .filter((item) => item.status !== 'done')
    .map((item) => ({ item, dueDate: item.balance_date || item.deposit_date }))
    .filter(({ dueDate }) => {
      const d = daysUntil(dueDate);
      return d != null && d <= 14;
    });

  return (
    <div className="card">
      <h2>예산 집행 현황</h2>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>총예산 대비 집행 {total > 0 ? Math.round((spent / total) * 100) : 0}%</span>
          <span>사용 {won(spent)} · 남음 {won(balance)}</span>
        </div>
        <Meter value={spent} max={total} height={14} />
        {balance < 0 && <span className="badge badge-warn" style={{ marginTop: 8, display: 'inline-block' }}>예산 초과</span>}
      </div>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>카테고리별 집행 보기</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {categoriesByTarget.map((c) => (
            <div key={c.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span>{c.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{won(c.spent)} / {won(c.target)}</span>
              </div>
              <Meter value={Number(c.spent)} max={Number(c.target) || 1} />
            </div>
          ))}
        </div>
      </details>

      {upcoming.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>D-14 이내 예정된 결제</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {upcoming.map(({ item, dueDate }) => (
              <li key={item.id} style={{ fontSize: '0.9rem', padding: '4px 0' }}>
                {item.item_name}{item.vendor_name && ` · ${item.vendor_name}`} · {won(item.final_amount)} · <span className="badge badge-warn">D-{daysUntil(dueDate)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ marginTop: 12 }}>
        <Link to="/budget" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          예산관리로 이동
        </Link>
      </p>
    </div>
  );
}
