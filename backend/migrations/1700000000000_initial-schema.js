exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id            BIGSERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{4,20}$'),
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL UNIQUE CHECK (nickname ~ '^[가-힣a-zA-Z0-9]{2,12}$'),
      role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      suspended_until TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE guide_content (
      id           BIGSERIAL PRIMARY KEY,
      section_key  TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL CHECK (content_type IN ('list', 'table', 'text')),
      content      JSONB NOT NULL,
      updated_by   BIGINT REFERENCES users(id),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE inquiries (
      id          BIGSERIAL PRIMARY KEY,
      user_id     BIGINT NOT NULL REFERENCES users(id),
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'ad')),
      status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
      admin_reply TEXT,
      replied_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_inquiries_user ON inquiries(user_id);

    CREATE TABLE announcements (
      id         BIGSERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      body       TEXT,
      type       TEXT NOT NULL DEFAULT 'banner' CHECK (type IN ('banner', 'popup')),
      starts_at  DATE,
      ends_at    DATE,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE couples (
      id                BIGSERIAL PRIMARY KEY,
      groom_user_id     BIGINT UNIQUE REFERENCES users(id),
      bride_user_id     BIGINT UNIQUE REFERENCES users(id),
      invite_code       TEXT UNIQUE,
      wedding_date      DATE,
      wedding_time      TIME,
      groom_name        TEXT,
      bride_name        TEXT,
      venue_season      TEXT CHECK (venue_season IN ('peak', 'off_peak')),
      venue_day_type    TEXT CHECK (venue_day_type IN ('saturday', 'sunday', 'weekday')),
      venue_booked_date DATE,
      roadmap_start_date DATE,
      hidden_roadmap_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
      custom_roadmap_tasks JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT couples_has_member CHECK (groom_user_id IS NOT NULL OR bride_user_id IS NOT NULL)
    );

    CREATE TABLE checklist_items (
      id         BIGSERIAL PRIMARY KEY,
      couple_id  BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      category   TEXT NOT NULL,
      title      TEXT NOT NULL,
      done       BOOLEAN NOT NULL DEFAULT false,
      assignee   TEXT CHECK (assignee IN ('groom', 'bride', 'both')),
      note       TEXT,
      note_groom TEXT,
      note_bride TEXT,
      due_date   DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_checklist_items_couple ON checklist_items(couple_id);

    CREATE TABLE roadmap_custom_items (
      id            BIGSERIAL PRIMARY KEY,
      couple_id     BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      phase_min_pct INTEGER NOT NULL,
      phase_max_pct INTEGER NOT NULL,
      title         TEXT NOT NULL,
      note          TEXT,
      done          BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX idx_roadmap_custom_items_couple ON roadmap_custom_items(couple_id);

    CREATE TABLE budget_settings (
      couple_id           BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
      total               NUMERIC(12, 0),
      category_targets    JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE budget_line_items (
      id               BIGSERIAL PRIMARY KEY,
      couple_id        BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      category         TEXT NOT NULL,
      item_name        TEXT NOT NULL,
      vendor_name      TEXT,
      planned          NUMERIC(12, 0) NOT NULL DEFAULT 0,
      total_amount     NUMERIC(12, 0) NOT NULL DEFAULT 0,
      unit_price       NUMERIC(12, 0),
      quantity         NUMERIC(8, 1),
      deposit_date     DATE,
      deposit_amount   NUMERIC(12, 0) NOT NULL DEFAULT 0,
      balance_date     DATE,
      balance_amount   NUMERIC(12, 0) NOT NULL DEFAULT 0,
      discount_date    DATE,
      discount_amount  NUMERIC(12, 0) NOT NULL DEFAULT 0,
      payer            TEXT CHECK (payer IN ('groom', 'bride')),
      payment_method   TEXT CHECK (payment_method IN ('card', 'cash', 'transfer')),
      status           TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
      receipt_issued   BOOLEAN,
      excluded_from_budget BOOLEAN NOT NULL DEFAULT false,
      memo             TEXT,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_budget_line_items_couple ON budget_line_items(couple_id);

    CREATE TABLE venues (
      id                   BIGSERIAL PRIMARY KEY,
      couple_id            BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      name                 TEXT NOT NULL,
      notes                TEXT,
      checks               JSONB NOT NULL DEFAULT '{}'::jsonb,
      quoted_price         NUMERIC(12, 0),
      is_booked            BOOLEAN NOT NULL DEFAULT false,
      rental_fee           NUMERIC(12, 0),
      meal_price           NUMERIC(12, 0),
      guaranteed_headcount INTEGER,
      extra_person_fee     NUMERIC(12, 0),
      mandatory_fee        NUMERIC(12, 0),
      nearby_station       TEXT,
      rating               SMALLINT CHECK (rating BETWEEN 1 AND 5)
    );
    CREATE INDEX idx_venues_couple ON venues(couple_id);

    CREATE TABLE venue_reference_quotes (
      id                   BIGSERIAL PRIMARY KEY,
      venue_id             BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      hall_name            TEXT,
      quote_date           DATE,
      day_type             TEXT CHECK (day_type IN ('saturday', 'sunday', 'weekday')),
      time_slot            TEXT,
      rental_fee           NUMERIC(12, 0),
      meal_price           NUMERIC(12, 0),
      guaranteed_headcount INTEGER,
      drinks_included      TEXT,
      contract_day_benefit TEXT,
      total_price          NUMERIC(12, 0),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_venue_reference_quotes_venue ON venue_reference_quotes(venue_id);

    CREATE TABLE guests (
      id         BIGSERIAL PRIMARY KEY,
      couple_id  BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      side       TEXT CHECK (side IN ('groom', 'bride')),
      group_name TEXT,
      phone      TEXT,
      rsvp       TEXT NOT NULL DEFAULT '미정' CHECK (rsvp IN ('참석', '불참', '미정')),
      meal_count INTEGER NOT NULL DEFAULT 1,
      notified   BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX idx_guests_couple ON guests(couple_id);

    CREATE TABLE invitation (
      couple_id  BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
      design_url TEXT,
      sent_date  DATE
    );

    CREATE TABLE vendors (
      id                 BIGSERIAL PRIMARY KEY,
      couple_id          BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      category            TEXT NOT NULL,
      name                TEXT NOT NULL,
      contact             TEXT,
      contract_status     TEXT NOT NULL DEFAULT '상담중' CHECK (contract_status IN ('상담중', '계약완료', '결제완료')),
      price               NUMERIC(12, 0),
      notes               TEXT,
      checklist_answers   JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE INDEX idx_vendors_couple ON vendors(couple_id);

    CREATE TABLE style_selection (
      couple_id                      BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
      selected                       TEXT,
      parents_entrance_song_choice  TEXT,
      groom_entrance_song_choice    TEXT,
      entrance_song_choice          TEXT,
      congratulatory_song_choice    TEXT,
      exit_song_choice               TEXT
    );

    CREATE TABLE sangyeonrye (
      couple_id              BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
      groom_region           TEXT,
      bride_region           TEXT,
      decided_place          TEXT,
      notes                  TEXT,
      pre_meeting_checklist  JSONB NOT NULL DEFAULT '{}'::jsonb,
      day_of_checklist       JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE honeymoon (
      couple_id           BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
      destination         TEXT,
      budget              NUMERIC(12, 0),
      flight_memo         TEXT,
      accommodation_memo  TEXT,
      notes               TEXT
    );

    CREATE TABLE honeymoon_flights (
      id           BIGSERIAL PRIMARY KEY,
      couple_id    BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      from_place   TEXT NOT NULL,
      to_place     TEXT NOT NULL,
      flight_no    TEXT,
      price        NUMERIC(12, 0),
      departure_at TIMESTAMPTZ,
      arrival_at   TIMESTAMPTZ,
      sort_order   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_honeymoon_flights_couple ON honeymoon_flights(couple_id);

    CREATE TABLE honeymoon_stays (
      id          BIGSERIAL PRIMARY KEY,
      couple_id   BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      destination TEXT NOT NULL,
      hotel_name  TEXT,
      price       NUMERIC(12, 0),
      nights      INTEGER,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_honeymoon_stays_couple ON honeymoon_stays(couple_id);

    CREATE TABLE wedding_day_timeline (
      id               BIGSERIAL PRIMARY KEY,
      couple_id        BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      time             TIME,
      duration_minutes NUMERIC(5, 1),
      assignee         TEXT,
      task             TEXT NOT NULL,
      script           TEXT,
      done             BOOLEAN NOT NULL DEFAULT false,
      is_mc_script     BOOLEAN NOT NULL DEFAULT true
    );
    CREATE INDEX idx_wedding_day_timeline_couple ON wedding_day_timeline(couple_id);

    CREATE TABLE wedding_day_gifts (
      id             BIGSERIAL PRIMARY KEY,
      couple_id      BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      side           TEXT CHECK (side IN ('groom', 'bride')),
      name           TEXT,
      amount         NUMERIC(12, 0),
      memo           TEXT,
      relation       TEXT,
      payment_method TEXT CHECK (payment_method IN ('cash', 'transfer')),
      meal_tickets   INTEGER
    );
    CREATE INDEX idx_wedding_day_gifts_couple ON wedding_day_gifts(couple_id);

    CREATE TABLE wedding_day_notes (
      couple_id  BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
      vows_groom TEXT,
      vows_bride TEXT
    );

    CREATE TABLE community_posts (
      id             BIGSERIAL PRIMARY KEY,
      author_user_id BIGINT NOT NULL REFERENCES users(id),
      nickname       TEXT NOT NULL,
      category       TEXT NOT NULL CHECK (category IN ('웨딩홀후기', '상견례장소', '자유')),
      region         TEXT,
      place_name     TEXT,
      rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
      title          TEXT NOT NULL,
      body           TEXT NOT NULL,
      blinded        BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_community_posts_category_region ON community_posts(category, region);
    CREATE INDEX idx_community_posts_place_name ON community_posts(place_name);

    CREATE TABLE community_comments (
      id             BIGSERIAL PRIMARY KEY,
      post_id        BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      author_user_id BIGINT NOT NULL REFERENCES users(id),
      nickname       TEXT NOT NULL,
      body           TEXT NOT NULL,
      blinded        BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_community_comments_post ON community_comments(post_id);

    CREATE TABLE community_reports (
      id               BIGSERIAL PRIMARY KEY,
      target_type      TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
      target_id        BIGINT NOT NULL,
      reporter_user_id BIGINT NOT NULL REFERENCES users(id),
      reason           TEXT NOT NULL CHECK (reason IN ('스팸광고', '욕설비방', '개인정보노출', '허위정보', '기타')),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (target_type, target_id, reporter_user_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS
      community_reports, community_comments, community_posts,
      wedding_day_notes, wedding_day_gifts, wedding_day_timeline,
      honeymoon_stays, honeymoon_flights, honeymoon,
      sangyeonrye, style_selection, vendors, invitation, guests,
      venue_reference_quotes, venues, budget_line_items, budget_settings,
      roadmap_custom_items, checklist_items, couples,
      announcements, inquiries, guide_content, users
    CASCADE;
  `);
};
