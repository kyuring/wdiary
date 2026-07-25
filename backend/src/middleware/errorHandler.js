export function notFound(req, res) {
  res.status(404).json({ error: '경로를 찾을 수 없습니다.' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.publicMessage || '서버 오류가 발생했습니다.' });
}
