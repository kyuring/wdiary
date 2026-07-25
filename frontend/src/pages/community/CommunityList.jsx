import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StarRatingDisplay } from '../../components/StarRating.jsx';
import CategoryBadge from './CategoryBadge.jsx';
import NewPostForm from './NewPostForm.jsx';
import { CATEGORIES, formatDate } from './helpers.js';

export default function CommunityList() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [writing, setWriting] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    api.get(`/community/posts${params.toString() ? `?${params}` : ''}`)
      .then((res) => setPosts(res.posts))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [category]);

  const runSearch = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>게시판</h1>
        {!writing && <button className="btn-primary" onClick={() => setWriting(true)}>+ 글쓰기</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}

      {writing && (
        <NewPostForm
          onCreated={(post) => setPosts((prev) => [post, ...(prev || [])])}
          onClose={() => setWriting(false)}
        />
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className={category === '' ? 'btn-primary' : 'btn-ghost'} onClick={() => setCategory('')}>전체</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={category === c ? 'btn-primary' : 'btn-ghost'} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <form onSubmit={runSearch} className="form-row">
          <div className="field">
            <label>장소명 검색</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="예: 더채플앳청담" />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-secondary" type="submit">검색</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!posts ? (
          <div className="full-page-center">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: 20, margin: 0 }}>아직 글이 없어요. 첫 글을 남겨보세요.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 12px', width: 90 }}>분류</th>
                  <th style={{ padding: '10px 12px' }}>제목</th>
                  <th style={{ padding: '10px 12px', width: 90 }}>글쓴이</th>
                  <th style={{ padding: '10px 12px', width: 90 }}>날짜</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="community-row" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <CategoryBadge category={post.category} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link to={`/community/${post.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>
                        {post.title}
                      </Link>
                      {Number(post.comment_count) > 0 && (
                        <span style={{ color: 'var(--accent-strong)', fontSize: '0.8rem', marginLeft: 6 }}>
                          [{post.comment_count}]
                        </span>
                      )}
                      {(post.place_name || post.rating) && (
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {post.region && `${post.region} · `}{post.place_name} <StarRatingDisplay rating={post.rating} />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{post.nickname}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(post.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
