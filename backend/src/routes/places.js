import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 카카오 로컬 API 키워드 검색 프록시. 프론트에 API 키를 노출하지 않기 위해 백엔드에서 대신 호출.
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(400).json({ error: '검색어를 입력해주세요.' });

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: '장소 검색이 아직 설정되지 않았습니다(관리자에게 문의).' });
    }

    const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
    url.searchParams.set('query', query);
    url.searchParams.set('size', '15');

    const kakaoRes = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    const body = await kakaoRes.json();

    if (!kakaoRes.ok) {
      return res.status(502).json({ error: body.message || '장소 검색에 실패했습니다.' });
    }

    const places = body.documents.map((d) => ({
      name: d.place_name,
      category: d.category_name,
      address: d.road_address_name || d.address_name,
      phone: d.phone || null,
      url: d.place_url,
      lat: d.y,
      lng: d.x,
    }));

    res.json({ places });
  } catch (err) {
    next(err);
  }
});

export default router;
