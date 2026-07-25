import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useCouple } from './context/CoupleContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CoupleSetup from './pages/CoupleSetup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Checklist from './pages/Checklist.jsx';
import Budget from './pages/Budget.jsx';
import VenueGuide from './pages/VenueGuide.jsx';
import Vendors from './pages/Vendors.jsx';
import Sangyeonrye from './pages/Sangyeonrye.jsx';
import Honeymoon from './pages/Honeymoon.jsx';
import Guests from './pages/Guests.jsx';
import StyleRecommendation from './pages/StyleRecommendation.jsx';
import WeddingDay from './pages/WeddingDay.jsx';
import { CommunityList, CommunityPost } from './pages/Community.jsx';
import Inquiries from './pages/Inquiries.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCouples from './pages/AdminCouples.jsx';
import AdminAnnouncements from './pages/AdminAnnouncements.jsx';
import AdminReports from './pages/AdminReports.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminGuideContent from './pages/AdminGuideContent.jsx';
import AdminInquiries from './pages/AdminInquiries.jsx';

function FullPageSpinner() {
  return <div className="full-page-center">불러오는 중...</div>;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function RequireCoupleSetup({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple();
  if (authLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (coupleLoading) return <FullPageSpinner />;
  // 커플이 이미 생성돼있으면(배우자 미가입 상태라도) 앱을 바로 쓸 수 있게 하고,
  // 초대 코드 안내는 대시보드 배너로 옮김
  if (couple) return <Navigate to="/" replace />;
  return children;
}

function RequireAppAccess() {
  const { user, loading: authLoading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple();
  if (authLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (coupleLoading) return <FullPageSpinner />;
  if (!couple) {
    // 순수 관리자 계정은 커플이 없어도 되므로 커플 설정 대신 관리자 페이지로 보냄
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/couple-setup" replace />;
  }
  return <Layout />;
}

// 게시판은 커플 데이터와 무관(닉네임만 있으면 됨)하므로, 커플이 없는 순수 관리자 계정도
// 글을 보고 관리(삭제)할 수 있어야 함 — 로그인 여부만 확인
function RequireLogin() {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

// 관리자 전용 계정은 커플이 없을 수 있어서(순수 관리 목적), RequireAppAccess의 커플 필수 체크를 거치지 않고
// 로그인+admin 권한만 확인한 뒤 바로 Layout(사이드바)을 보여줌
function RequireAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/couple-setup" element={<RequireCoupleSetup><CoupleSetup /></RequireCoupleSetup>} />
      <Route element={<RequireAppAccess />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/venues" element={<VenueGuide />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/sangyeonrye" element={<Sangyeonrye />} />
        <Route path="/honeymoon" element={<Honeymoon />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/style" element={<StyleRecommendation />} />
        <Route path="/wedding-day" element={<WeddingDay />} />
      </Route>
      <Route element={<RequireLogin />}>
        <Route path="/community" element={<CommunityList />} />
        <Route path="/community/:id" element={<CommunityPost />} />
        <Route path="/inquiries" element={<Inquiries />} />
      </Route>
      <Route element={<RequireAdminAccess />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/couples" element={<AdminCouples />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/guide-content" element={<AdminGuideContent />} />
        <Route path="/admin/inquiries" element={<AdminInquiries />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
