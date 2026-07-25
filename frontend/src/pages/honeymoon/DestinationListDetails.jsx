import { won } from './helpers.js';

export default function DestinationListDetails({ destinationGuide }) {
  return (
    <details style={{ marginTop: 16 }}>
      <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>전체 목적지 목록 보기 (저렴한 순)</summary>
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: 8 }}>목적지</th>
              <th style={{ padding: 8 }}>항공권(1인 왕복)</th>
              <th style={{ padding: 8 }}>숙소 성수기(1박)</th>
              <th style={{ padding: 8 }}>숙소 비수기(1박)</th>
              <th style={{ padding: 8 }}>직항 여부</th>
            </tr>
          </thead>
          <tbody>
            {[...destinationGuide]
              .sort((a, b) => (a.flightPerPerson + a.accommodationOffPeak) - (b.flightPerPerson + b.accommodationOffPeak))
              .map((d) => (
              <tr key={d.name} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: 8 }}>{won(d.flightPerPerson)}</td>
                <td style={{ padding: 8 }}>{won(d.accommodationPeak)}</td>
                <td style={{ padding: 8 }}>{won(d.accommodationOffPeak)}</td>
                <td style={{ padding: 8 }}>{d.directFlight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
