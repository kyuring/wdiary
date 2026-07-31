import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent, useGuideContentReady } from '../context/GuideContentContext.jsx';
import { useCouple } from '../context/CoupleContext.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import CategorySection from './budget/CategorySection.jsx';
import AllocationGuide from './budget/AllocationGuide.jsx';
import SettlementReport from './budget/SettlementReport.jsx';
import PayerMethodTable from './budget/PayerMethodTable.jsx';
import { won, recommendedFor } from './budget/helpers.js';

export default function Budget() {
  const { couple } = useCouple();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [vendorNames, setVendorNames] = useState([]);
  const [tab, setTab] = useState('summary');
  const [preset, setPreset] = useState('average');
  const categories = useGuideContent('budget.categories');
  const presets = useGuideContent('budget.presets');
  const guideReady = useGuideContentReady();

  const load = () => api.get('/budget').then((res) => {
    setData(res);
    setTargetInput(res.totals.targetTotal ?? '');
  });

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  // 업체컨택 관리(vendors)와 웨딩홀 가이드(venues)에 등록한 업체명을 자동완성으로 재사용
  useEffect(() => {
    Promise.all([api.get('/vendors'), api.get('/venues')])
      .then(([vendorsRes, venuesRes]) => {
        const names = [
          ...vendorsRes.vendors.map((v) => v.name),
          ...venuesRes.venues.map((v) => v.name),
        ];
        setVendorNames([...new Set(names)]);
      })
      .catch(() => {});
  }, []);

  const saveTarget = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.patch('/budget/settings', { total: Number(targetInput || 0) });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCategoryTargets = async (nextTargets) => {
    setError('');
    try {
      await api.patch('/budget/settings', { category_targets: nextTargets });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addLineItem = async (category, fields) => {
    setError('');
    try {
      const result = await api.post('/budget/line-items', { category, ...fields });
      setData((prev) => ({ ...prev, lineItems: [...prev.lineItems, result.lineItem] }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateLineItem = async (item, fields) => {
    setError('');
    try {
      await api.patch(`/budget/line-items/${item.id}`, fields);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteLineItem = async (item) => {
    try {
      await api.delete(`/budget/line-items/${item.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !data) return <div className="full-page-center">{error}</div>;
  if (guideReady && !categories) {
    return <div className="full-page-center">설정 정보를 불러오지 못했어요. 새로고침해주세요.</div>;
  }
  if (!data || !categories) return <div className="full-page-center">불러오는 중...</div>;

  const { totals, payerMethodBreakdown } = data;
  const summaryByCategory = new Map(data.categories.map((c) => [c.name, c]));
  const targetNum = Number(targetInput) || 0;
  const ratios = presets ? presets[preset] : null;
  const categoryTargets = data.settings?.category_targets;
  const targetByCategory = new Map(
    categories.map((c) => [c, presets ? recommendedFor(c, targetNum, ratios, categoryTargets) : 0])
  );

  return (
    <div>
      <h1>예산관리</h1>
      <datalist id="budget-vendor-names">
        {vendorNames.map((name) => <option key={name} value={name} />)}
      </datalist>
      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={tab === 'summary' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('summary')}>요약</button>
        <button className={tab === 'settlement' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('settlement')}>정산 리포트</button>
        {categories.map((category) => {
          const summary = summaryByCategory.get(category);
          const overCategory = (summary?.spent || 0) > targetByCategory.get(category);
          return (
            <button key={category} className={tab === category ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(category)}>
              {category}
              {overCategory && <span className="badge badge-warn" style={{ marginLeft: 6, fontSize: '0.65rem' }}>초과</span>}
            </button>
          );
        })}
      </div>

      {tab === 'summary' && (
        <>
          <div className="card">
            <h2>전체 예산</h2>
            <form onSubmit={saveTarget} className="form-row">
              <div className="field">
                <label>전체 계획 예산(목표)</label>
                <MoneyInput value={targetInput} onChange={setTargetInput} />
              </div>
              <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
                <label>&nbsp;</label>
                <button className="btn-primary" type="submit">저장</button>
              </div>
            </form>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12, fontSize: '0.9rem' }}>
              <span>총 사용금액: <strong>{won(totals.spentTotal)}</strong></span>
              <span>남은예산: <strong style={{ color: totals.remaining < 0 ? 'var(--danger)' : 'inherit' }}>{won(totals.remaining)}</strong></span>
              {totals.overageVsTarget != null && (
                <span>
                  목표 대비: <strong style={{ color: totals.overageVsTarget > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {totals.overageVsTarget > 0 ? `${won(totals.overageVsTarget)} 초과` : `${won(-totals.overageVsTarget)} 여유`}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <AllocationGuide
            target={targetInput}
            presets={presets}
            preset={preset}
            onPresetChange={setPreset}
            categories={categories}
            categoryTargets={data.settings?.category_targets}
            onSaveTargets={saveCategoryTargets}
            summaryByCategory={summaryByCategory}
          />

          <PayerMethodTable payerMethodBreakdown={payerMethodBreakdown} />
        </>
      )}

      {tab === 'settlement' && (
        <SettlementReport
          weddingDate={couple.wedding_date}
          totals={totals}
          categories={data.categories}
          targetByCategory={targetByCategory}
          lineItems={data.lineItems}
        />
      )}

      {tab !== 'summary' && tab !== 'settlement' && (
        <CategorySection
          category={tab}
          summary={summaryByCategory.get(tab)}
          items={data.lineItems.filter((i) => i.category === tab)}
          recommended={targetByCategory.get(tab) || 0}
          onAdd={addLineItem}
          onUpdate={updateLineItem}
          onDelete={deleteLineItem}
        />
      )}
    </div>
  );
}
