import { useState } from 'react';
import { searchDestinations, accommodationRate, isPeakMonth, flightItinerary, miscTotal } from '../../lib/honeymoonGuide.js';
import { won } from './helpers.js';
import DestinationListDetails from './DestinationListDetails.jsx';

export default function DestinationCalculator({ destinationGuide, onApply }) {
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');
  const [nightsByDestination, setNightsByDestination] = useState({});
  const [results, setResults] = useState(null);
  const [applying, setApplying] = useState(false);

  const search = (e) => {
    e.preventDefault();
    setResults(searchDestinations(destinationGuide, query));
  };

  const setNights = (name, value) => {
    setNightsByDestination((prev) => ({ ...prev, [name]: value }));
  };

  const isMultiCity = (results?.length || 0) > 1;

  // 2개국 이상이면 항공료는 나라별로 따로 왕복 계산하지 않음 — "한국→A→B→한국" 한 여정이라
  // 첫 입국편+마지막 귀국편(왕복가의 절반씩)+나라 사이 이동편만 더함(multiCityFlightPerPerson).
  // 그래서 나라별 소계는 숙소비+기타경비만, 항공료는 여정 전체 기준으로 한 번만 계산해서 아래 합계에 더함.
  const staySubtotal = (d) => {
    const nights = nightsByDestination[d.name];
    if (nights === undefined || nights === '') return null;
    return accommodationRate(d, month) * Number(nights) + miscTotal(d, nights);
  };

  const allNightsFilled = results?.length > 0 && results.every((d) => staySubtotal(d) != null);
  const totalStay = allNightsFilled ? results.reduce((sum, d) => sum + staySubtotal(d), 0) : null;
  const legs = results?.length ? flightItinerary(results) : [];
  const flightTotal = legs.length ? legs.reduce((sum, leg) => sum + leg.cost, 0) * 2 : null;
  const grandTotal = allNightsFilled && flightTotal != null ? totalStay + flightTotal : null;

  const apply = async () => {
    setApplying(true);
    try {
      await onApply({
        legs: legs.map((leg) => ({ from: leg.from, to: leg.to, price: Math.round(leg.cost * 2) })),
        stays: results.map((d) => ({
          destination: d.name,
          nights: nightsByDestination[d.name] ? Number(nightsByDestination[d.name]) : null,
        })),
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="card">
      <h2>목적지 검색 & 대략 비용 계산</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 10 }}>
        국가명을 콤마로 구분해 검색하세요(예: "프랑스, 스페인"). 나라마다 머무는 일수가 다를 수 있어서
        결과에서 나라별로 박수를 따로 입력해요. 합계에는 항공권·숙소에 더해 1인 1일 기타경비(식비·현지교통·액티비티)도
        참고치로 포함되지만, 비자·여행자보험·쇼핑 등은 빠져있어요. 실시간 시세가 아니니 실제 예약 전 꼭 확인하세요.
      </p>
      <form onSubmit={search} className="form-row">
        <div className="field">
          <label>목적지</label>
          <input
            list="destinations-calc"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 프랑스, 스페인"
          />
          <datalist id="destinations-calc">
            {destinationGuide.map((d) => <option key={d.name} value={d.name} />)}
          </datalist>
        </div>
        <div className="field">
          <label>여행 월</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">선택 안 함</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn-secondary" type="submit">검색</button>
        </div>
      </form>

      {results && (
        results.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>참고 데이터가 없는 목적지예요. 직접 검색해보세요.</p>
        ) : (
          <>
            {isMultiCity && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  경로: 한국 → {results.map((d) => d.name).join(' → ')} → 한국 (다구간 여정이라 나라별 왕복표를 각각 사지 않고
                  아래처럼 구간별로 계산해요 — 마지막 나라에서 한국으로 돌아오는 귀국편도 포함돼 있어요)
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem' }}>
                  {legs.map((leg, idx) => (
                    <li key={idx}>
                      {leg.from} → {leg.to} ({leg.label}, 1인 {won(leg.cost)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: 8 }}>목적지</th>
                    {!isMultiCity && <th style={{ padding: 8 }}>항공권(1인 왕복)</th>}
                    <th style={{ padding: 8 }}>숙소(1박)</th>
                    <th style={{ padding: 8 }}>기타경비(1인/일)</th>
                    <th style={{ padding: 8 }}>직항 여부</th>
                    <th style={{ padding: 8 }}>이 나라 박수</th>
                    <th style={{ padding: 8 }}>{isMultiCity ? '숙소+기타 소계' : '소계(2인)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((d) => {
                    const rate = accommodationRate(d, month);
                    const peak = isPeakMonth(d, month);
                    const staySub = staySubtotal(d);
                    // 단일 목적지일 때만 항공료를 소계에 합침(다구간이면 아래 여정 전체 합계에서 한 번만 계산)
                    const sub = staySub == null ? null : isMultiCity ? staySub : d.flightPerPerson * 2 + staySub;
                    return (
                      <tr key={d.name} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 8, fontWeight: 600 }}>{d.name}</td>
                        {!isMultiCity && <td style={{ padding: 8 }}>{won(d.flightPerPerson)}</td>}
                        <td style={{ padding: 8 }}>
                          {won(rate)}
                          {month !== '' && (
                            <span className={`badge ${peak ? 'badge-warn' : 'badge-success'}`} style={{ marginLeft: 6, fontSize: '0.65rem' }}>
                              {peak ? '성수기' : '비수기'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: 8 }}>{won(d.dailyMiscPerPerson)}</td>
                        <td style={{ padding: 8 }}>{d.directFlight}</td>
                        <td style={{ padding: 8 }}>
                          <input
                            type="number"
                            min="0"
                            style={{ width: 70 }}
                            value={nightsByDestination[d.name] ?? ''}
                            onChange={(e) => setNights(d.name, e.target.value)}
                            placeholder="박"
                          />
                        </td>
                        <td style={{ padding: 8, fontWeight: 600, color: 'var(--accent-strong)' }}>
                          {sub != null ? won(sub) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {isMultiCity && flightTotal != null && (
              <p style={{ marginTop: 10, fontSize: '0.9rem' }}>
                항공료 합계(위 구간 전부, 2인): <strong>{won(flightTotal)}</strong>
              </p>
            )}
            {grandTotal != null && (
              <p style={{ marginTop: 4, fontSize: '0.9rem' }}>
                전체 합계(2인): <strong style={{ color: 'var(--accent-strong)' }}>{won(grandTotal)}</strong>
              </p>
            )}
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={apply} disabled={applying}>
              {applying ? '적용 중...' : '우리 신혼여행에 적용하기'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
              아래 "항공편"·"숙소" 목록에 이 계산 결과가 추가돼요. 실제 예약 후 편명·정확한 금액·시간으로 고쳐두세요.
            </p>
          </>
        )
      )}

      <DestinationListDetails destinationGuide={destinationGuide} />
    </div>
  );
}
