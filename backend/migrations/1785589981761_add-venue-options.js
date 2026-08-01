/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE venue_options (
      id                   BIGSERIAL PRIMARY KEY,
      venue_id             BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      label                TEXT, -- 이 옵션 구분용 메모(예: "토요일 1시", "그랜드홀")
      scheduled_date       DATE,
      ceremony_time        TIME,
      meal_service_until   TIME,
      rental_fee           NUMERIC(12, 0),
      meal_price           NUMERIC(12, 0),
      guaranteed_headcount INTEGER,
      extra_person_fee     NUMERIC(12, 0),
      mandatory_fee        NUMERIC(12, 0),
      quoted_price         NUMERIC(12, 0), -- 세부 항목 없이 총액만 받은 경우
      is_selected          BOOLEAN NOT NULL DEFAULT false -- 이 옵션으로 예약 확정됨
    );
    CREATE INDEX idx_venue_options_venue ON venue_options(venue_id);

    -- 기존 venues에 있던 가격·시간 데이터를 후보당 옵션 1개로 그대로 이관(데이터 보존)
    INSERT INTO venue_options (
      venue_id, scheduled_date, ceremony_time, meal_service_until,
      rental_fee, meal_price, guaranteed_headcount, extra_person_fee, mandatory_fee,
      quoted_price, is_selected
    )
    SELECT id, scheduled_date, ceremony_time, meal_service_until,
           rental_fee, meal_price, guaranteed_headcount, extra_person_fee, mandatory_fee,
           quoted_price, is_booked
    FROM venues
    WHERE rental_fee IS NOT NULL OR meal_price IS NOT NULL OR guaranteed_headcount IS NOT NULL
       OR extra_person_fee IS NOT NULL OR mandatory_fee IS NOT NULL OR ceremony_time IS NOT NULL
       OR meal_service_until IS NOT NULL OR scheduled_date IS NOT NULL OR quoted_price IS NOT NULL;

    ALTER TABLE venues
      DROP COLUMN quoted_price,
      DROP COLUMN rental_fee,
      DROP COLUMN meal_price,
      DROP COLUMN guaranteed_headcount,
      DROP COLUMN extra_person_fee,
      DROP COLUMN mandatory_fee,
      DROP COLUMN ceremony_time,
      DROP COLUMN meal_service_until,
      DROP COLUMN scheduled_date;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE venues
      ADD COLUMN quoted_price         NUMERIC(12, 0),
      ADD COLUMN rental_fee           NUMERIC(12, 0),
      ADD COLUMN meal_price           NUMERIC(12, 0),
      ADD COLUMN guaranteed_headcount INTEGER,
      ADD COLUMN extra_person_fee     NUMERIC(12, 0),
      ADD COLUMN mandatory_fee        NUMERIC(12, 0),
      ADD COLUMN ceremony_time        TIME,
      ADD COLUMN meal_service_until   TIME,
      ADD COLUMN scheduled_date       DATE;

    -- 후보당 옵션이 여러 개였다면 하나만(확정된 것 우선, 없으면 가장 먼저 만든 것) 되돌림 — 완전한 복원은 아님
    UPDATE venues v SET
      quoted_price = o.quoted_price,
      rental_fee = o.rental_fee,
      meal_price = o.meal_price,
      guaranteed_headcount = o.guaranteed_headcount,
      extra_person_fee = o.extra_person_fee,
      mandatory_fee = o.mandatory_fee,
      ceremony_time = o.ceremony_time,
      meal_service_until = o.meal_service_until,
      scheduled_date = o.scheduled_date
    FROM (
      SELECT DISTINCT ON (venue_id) *
      FROM venue_options
      ORDER BY venue_id, is_selected DESC, id ASC
    ) o
    WHERE o.venue_id = v.id;

    DROP TABLE venue_options;
  `);
};
