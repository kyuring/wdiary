import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { StarRatingDisplay } from '../../components/StarRating.jsx';
import CategoryBadge from './CategoryBadge.jsx';
import ReportButton from './ReportButton.jsx';
import { formatDate } from './helpers.js';

export default function CommunityPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    api.get(`/community/posts/${id}`)
      .then((res) => { setPost(res.post); setComments(res.comments); })
      .catch((err) => setError(err.message));
  }, [id]);

  const deletePost = async () => {
    if (user?.role === 'admin') {
      await api.delete(`/admin/posts/${id}`);
    } else {
      await api.delete(`/community/posts/${id}`);
    }
    navigate('/community');
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const result = await api.post(`/community/posts/${id}/comments`, { body: commentBody.trim() });
      setComments((prev) => [...prev, result.comment]);
      setCommentBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (user?.role === 'admin') {
      await api.delete(`/admin/comments/${commentId}`);
    } else {
      await api.delete(`/community/comments/${commentId}`);
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (error) return <div className="error-banner">{error}</div>;
  if (!post || !comments) return <div className="full-page-center">불러오는 중...</div>;

  return (
    <div>
      <Link to="/community" className="btn-ghost">← 목록으로</Link>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <CategoryBadge category={post.category} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(post.created_at)}</span>
        </div>
        <h1 style={{ margin: '10px 0 4px' }}>{post.title}</h1>
        {(post.place_name || post.rating) && (
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)' }}>
            {post.region && `${post.region} · `}{post.place_name} <StarRatingDisplay rating={post.rating} />
          </p>
        )}
        <p style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{post.nickname}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <ReportButton targetType="post" targetId={post.id} />
            {(post.author_user_id === user?.id || user?.role === 'admin') && (
              <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px' }} onClick={deletePost}>
                {post.author_user_id === user?.id ? '삭제' : '관리자 삭제'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>댓글 {comments.length}</h2>
        {comments.map((c) => (
          <div key={c.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
            <p style={{ margin: '0 0 4px' }}>{c.body}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.nickname} · {formatDate(c.created_at)}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <ReportButton targetType="comment" targetId={c.id} />
                {(c.author_user_id === user?.id || user?.role === 'admin') && (
                  <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px' }} onClick={() => deleteComment(c.id)}>
                    {c.author_user_id === user?.id ? '삭제' : '관리자 삭제'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <form onSubmit={addComment} style={{ marginTop: 12 }}>
          <div className="field">
            <label>댓글 남기기</label>
            <input value={commentBody} onChange={(e) => setCommentBody(e.target.value)} />
          </div>
          <button className="btn-secondary" type="submit" disabled={submittingComment}>
            {submittingComment ? '등록 중...' : '댓글 등록'}
          </button>
        </form>
      </div>
    </div>
  );
}
