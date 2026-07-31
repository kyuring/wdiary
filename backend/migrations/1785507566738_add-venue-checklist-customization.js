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
    ALTER TABLE couples
      ADD COLUMN hidden_venue_checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN custom_venue_checklist_items JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE couples
      DROP COLUMN hidden_venue_checklist_items,
      DROP COLUMN custom_venue_checklist_items;
  `);
};
