import { useState } from 'react';
import { useCouple } from '../context/CoupleContext.jsx';
import { calcDday, calcElapsedPercent, needsVenueUrgencyBadge } from '../lib/roadmap.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';
import InviteBanner from '../components/InviteBanner.jsx';
import WeddingJourneyTimeline from '../components/WeddingJourneyTimeline.jsx';
import DdayLabel from './dashboard/DdayLabel.jsx';
import AnnouncementBanner from './dashboard/AnnouncementBanner.jsx';
import WeddingInfoModal from './dashboard/WeddingInfoModal.jsx';
import TodoWidget from './dashboard/TodoWidget.jsx';
import BudgetWidget from './dashboard/BudgetWidget.jsx';
import RoadmapPath from './dashboard/RoadmapPath.jsx';
import VenueSummaryWidget, { BookedVenueLine } from './dashboard/VenueSummaryWidget.jsx';
import VendorSummaryWidget from './dashboard/VendorSummaryWidget.jsx';
import SangyeonryeSummaryWidget from './dashboard/SangyeonryeSummaryWidget.jsx';
import HoneymoonSummaryWidget from './dashboard/HoneymoonSummaryWidget.jsx';
import { formatTime } from './dashboard/helpers.js';

export default function Dashboard() {
  const { couple, updateCouple } = useCouple();
  const [modalOpen, setModalOpen] = useState(false);
  const phases = useGuideContent('roadmap.phases');
  const venueLeadTimeMonths = useGuideContent('roadmap.venue_lead_time');

  const dday = calcDday(couple.wedding_date);
  const percent = calcElapsedPercent(couple.roadmap_start_date, couple.wedding_date);
  const urgent = needsVenueUrgencyBadge(venueLeadTimeMonths, {
    weddingDateStr: couple.wedding_date,
    venueBookedDate: couple.venue_booked_date,
    venueSeason: couple.venue_season,
    venueDayType: couple.venue_day_type,
  });

  return (
    <div>
      <h1>대시보드</h1>

      <AnnouncementBanner />

      {(!couple.groom_user_id || !couple.bride_user_id) && <InviteBanner couple={couple} />}

      <WeddingJourneyTimeline percent={percent} dday={dday} />

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>D-day</h2>
          <DdayLabel days={dday} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {couple.wedding_date && (
            <p style={{ color: 'var(--text-muted)' }}>
              {couple.wedding_date}
              {couple.wedding_time && ` · ${formatTime(couple.wedding_time)}`}
            </p>
          )}
          <BookedVenueLine />
          {couple.groom_name && couple.bride_name && (
            <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
              {couple.groom_name} ♥ {couple.bride_name}
            </p>
          )}
          {urgent && (
            <p style={{ marginTop: 12 }}>
              <span className="badge badge-warn">⚠ 웨딩홀 예약을 최우선으로 서두르세요</span>
            </p>
          )}
          <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
            결혼식 정보 수정
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <VenueSummaryWidget />
        <VendorSummaryWidget />
        <SangyeonryeSummaryWidget />
        <HoneymoonSummaryWidget />
      </div>

      <div className="dashboard-grid">
        <TodoWidget />
        <BudgetWidget />
      </div>

      <RoadmapPath phases={phases} percent={percent} />

      {modalOpen && (
        <WeddingInfoModal couple={couple} onClose={() => setModalOpen(false)} onSave={updateCouple} />
      )}
    </div>
  );
}
