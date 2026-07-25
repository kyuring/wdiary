import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCouple } from '../context/CoupleContext.jsx';

// 그룹 없이 나열하면 항목이 늘어날수록 훑어보기 어려워서, 성격이 비슷한 메뉴끼리 묶음.
// group이 null이면 구분 라벨 없이 바로 보임(대시보드처럼 그 자체로 최상위인 항목).
const ACTIVE_LINK_GROUPS = [
  { group: null, links: [{ to: '/', label: '대시보드', end: true }] },
  {
    group: '웨딩홀',
    links: [
      { to: '/venues', label: '웨딩홀' },
      { to: '/vendors', label: '업체 컨택 관리' },
    ],
  },
  {
    group: '예산',
    links: [{ to: '/budget', label: '예산관리' }],
  },
  {
    group: '일정 관리',
    links: [
      { to: '/checklist', label: '체크리스트' },
      { to: '/sangyeonrye', label: '상견례' },
      { to: '/wedding-day', label: '예식 당일' },
    ],
  },
  {
    group: '그 외',
    links: [
      { to: '/guests', label: '하객·청첩장' },
      { to: '/style', label: '스타일 추천' },
      { to: '/honeymoon', label: '신혼여행' },
    ],
  },
];

// 게시판·문의하기는 커플 데이터와 무관해서 커플 없는 순수 관리자 계정도 볼 수 있어야 함.
// 커플별 준비 메뉴와 구분되는 별도 묶음이라 "이용자 메뉴"로 따로 라벨링해서 하단에 배치.
const USER_LINKS = [
  { to: '/community', label: '게시판' },
  { to: '/inquiries', label: '문의하기' },
];

const ADMIN_LINKS = [
  { to: '/admin', label: '현황', end: true },
  { to: '/admin/couples', label: '이용 커플 현황' },
  { to: '/admin/announcements', label: '공지사항' },
  { to: '/admin/reports', label: '신고 관리' },
  { to: '/admin/users', label: '사용자 관리' },
  { to: '/admin/guide-content', label: '가이드 콘텐츠' },
  { to: '/admin/inquiries', label: '문의 관리' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { couple } = useCouple();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 모바일 드로어가 열려있는 동안은 배경 스크롤을 잠금 — 안 잠그면 콘텐츠를 드래그할 때
  // 고정(position:fixed) 사이드바가 배경과 같이 딸려 움직이는 것처럼 보임(모바일 브라우저에서 흔한 현상)
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="brand">우리웨딩 노트</span>
          <button className="btn-ghost sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="메뉴 닫기">
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          {/* 커플이 없는 순수 관리자 계정은 일반 이용자용 메뉴를 써봤자 다 관리자 페이지로 튕기니 숨김(게시판은 예외) */}
          {couple && ACTIVE_LINK_GROUPS.map(({ group, links }) => (
            <div key={group || 'top'} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 16px 4px' }}>{group}</div>}
              {links.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
          {user?.role === 'admin' && (
            <>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 16px 4px' }}>관리자 메뉴</div>
              {ADMIN_LINKS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
                >
                  {label}
                </NavLink>
              ))}
            </>
          )}
          {/* 관리자 메뉴가 같이 보일 때만 구분용 라벨이 의미가 있음(일반 사용자는 이게 유일한 메뉴라 라벨 불필요) */}
          {user?.role === 'admin' && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 16px 4px' }}>이용자 메뉴</div>
          )}
          {USER_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="메뉴 열기">
            ☰
          </button>
          <span className="brand topbar-brand">우리웨딩 노트</span>
          <div className="topbar-user">
            <span className="nickname">{user?.nickname}님</span>
            <button className="btn-ghost" onClick={logout}>로그아웃</button>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
