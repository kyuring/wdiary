import { won, PAYER_LABELS, METHOD_LABELS } from './helpers.js';

export default function PayerMethodTable({ payerMethodBreakdown }) {
  if (payerMethodBreakdown.length === 0) return null;

  return (
    <div className="card">
      <h2>결제자·결제수단별 사용금액</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: 8 }}>결제자</th>
              <th style={{ padding: 8 }}>결제수단</th>
              <th style={{ padding: 8 }}>금액</th>
            </tr>
          </thead>
          <tbody>
            {payerMethodBreakdown.map((row) => (
              <tr key={`${row.payer}-${row.method}`} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{PAYER_LABELS[row.payer]}</td>
                <td style={{ padding: 8 }}>{METHOD_LABELS[row.method]}</td>
                <td style={{ padding: 8 }}>{won(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
