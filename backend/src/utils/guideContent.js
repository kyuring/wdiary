import { query } from '../db.js';

export async function getGuideContent(key) {
  const result = await query('SELECT content FROM guide_content WHERE section_key = $1', [key]);
  return result.rows[0]?.content ?? null;
}
