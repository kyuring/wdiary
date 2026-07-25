import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const CATEGORY_LABELS = { general: '일반문의', ad: '광고문의' };

function formatDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 10);
}

function MonthlySignupChart({ data }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)' }}>가입자 데이터가 없어요.</p>;
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, padding: '8px 4px 0' }}>
      {data.map((d) => (
        <div key={d.month} title={`${d.month} · ${d.count}명`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minHeight: '1em' }}>{d.count > 0 ? d.count : ''}</span>
          <div
            style={{
              width: '100%',
              maxWidth: 28,
              height: `${Math.max(2, (d.count / max) * 100)}px`,
              background: 'var(--accent)',
              borderRadius: '4px 4px 0 0',
            }}
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.month.slice(5)}월</span>
        </div>
      ))}
    </div>
  );
}

function StatsSection({ stats }) {
  const cards = [
    ['가입자', stats.userCount],
    ['커플', stats.coupleCount],
    ['이번주 신규가입', stats.newUsersThisWeek],
    ['D-30 이내 예정 결혼식', stats.upcomingWeddings30d],
    ['게시글', stats.postCount],
    ['댓글', stats.commentCount],
    ['처리 대기중인 신고', stats.pendingReportTargets],
  ];

  return (
    <div className="card">
      <h2>현황</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {cards.map(([label, value]) => (
          <div key={label} style={{ minWidth: 100 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InquiriesSummary({ byCategory }) {
  const safeByCategory = byCategory || [];
  const total = safeByCategory.reduce((sum, c) => sum + c.count, 0);
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>답변 대기중인 문의</h2>
        <Link to="/admin/inquiries" className="btn-ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>전체 보기</Link>
      </div>
      {total === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>답변 대기중인 문의가 없어요.</p>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {safeByCategory.map((c) => (
            <div key={c.category} style={{ minWidth: 100 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{CATEGORY_LABELS[c.category] || c.category}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warn)' }}>{c.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentReportsPreview() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/admin/reports').then((res) => setItems(res.items.slice(0, 5))).catch(() => setItems([]));
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>최근 신고</h2>
        <Link to="/admin/reports" className="btn-ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>전체 보기</Link>
      </div>
      {!items ? (
        <p style={{ marginTop: 8 }}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>신고된 글·댓글이 없어요.</p>
      ) : (
        items.map((item) => (
          <div key={`${item.target_type}-${item.target_id}`} style={{ borderTop: '1px solid var(--border)', padding: '8px 0', fontSize: '0.85rem' }}>
            <span className="badge badge-warn">{item.target_type === 'post' ? '게시글' : '댓글'}</span>{' '}
            신고 {item.report_count}건
            {item.target?.blinded && <span className="badge badge-danger" style={{ marginLeft: 6 }}>블라인드됨</span>}
            {item.target?.title && <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{item.target.title}</span>}
          </div>
        ))
      )}
    </div>
  );
}

function RecentAnnouncementsPreview() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/announcements').then((res) => setItems(res.announcements.slice(0, 5))).catch(() => setItems([]));
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>공지사항</h2>
        <Link to="/admin/announcements" className="btn-ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>전체 보기</Link>
      </div>
      {!items ? (
        <p style={{ marginTop: 8 }}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>등록된 공지사항이 없어요.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0', fontSize: '0.85rem' }}>
            <strong>{item.title}</strong>{' '}
            {item.is_active ? <span className="badge badge-success">활성</span> : <span className="badge badge-neutral">비활성</span>}{' '}
            <span style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div>
      <h1>관리자 대시보드</h1>
      {!stats ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <StatsSection stats={stats} />
          <div className="card">
            <h2>월별 신규 가입자</h2>
            <MonthlySignupChart data={stats.signupsByMonth} />
          </div>
          <InquiriesSummary byCategory={stats.openInquiriesByCategory} />
          <RecentReportsPreview />
          <RecentAnnouncementsPreview />
        </>
      )}
    </div>
  );
}
