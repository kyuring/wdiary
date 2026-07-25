import pg from 'pg';
import 'dotenv/config';

// DATE 컬럼을 JS Date로 파싱하면 로컬 타임존 기준으로 변환되면서 날짜가 하루 밀려 보이는 문제가 있어,
// 'YYYY-MM-DD' 문자열 그대로 반환하도록 설정 (프론트에서 날짜 문자열로 직접 다룸)
pg.types.setTypeParser(1082, (val) => val);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);
