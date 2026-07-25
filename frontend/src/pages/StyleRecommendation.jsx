import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';

function SongPicker({ label, options, value, onSave }) {
  const isCustomValue = !!value && !options.includes(value);
  const [customText, setCustomText] = useState(isCustomValue ? value : '');

  useEffect(() => {
    setCustomText(isCustomValue ? value : '');
  }, [value, isCustomValue]);

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {options.map((song) => (
          <button
            key={song}
            type="button"
            className={value === song ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: '0.82rem' }}
            onClick={() => onSave(song)}
          >
            {value === song ? '★ ' : ''}{song}
          </button>
        ))}
      </div>
      <input
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        onBlur={() => customText.trim() && customText.trim() !== value && onSave(customText.trim())}
        placeholder="목록에 없다면 직접 입력하세요"
        style={{ width: '100%', maxWidth: 360 }}
      />
    </div>
  );
}

export default function StyleRecommendation() {
  const [data, setData] = useState(null);
  const styles = useGuideContent('style.recommendations');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/style').then((res) => setData(res.styleSelection || {})).catch((err) => setError(err.message));
  }, []);

  const patch = async (fields) => {
    setError('');
    try {
      const result = await api.patch('/style', fields);
      setData(result.styleSelection);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!data || !styles) return <div className="full-page-center">불러오는 중...</div>;

  const selectedStyle = styles.find((s) => s.key === data.selected);

  return (
    <div>
      <h1>스타일 추천</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>스타일 선택</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {styles.map((s) => (
            <div
              key={s.key}
              className="nav-card"
              style={{
                flex: '1 1 140px',
                cursor: 'pointer',
                borderStyle: 'solid',
                borderColor: data.selected === s.key ? 'var(--accent)' : 'var(--border)',
                background: data.selected === s.key ? 'var(--accent-bg)' : 'var(--bg-alt)',
                color: data.selected === s.key ? 'var(--accent-strong)' : 'var(--text-muted)',
              }}
              onClick={() => patch({ selected: s.key })}
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {selectedStyle && (
        <div className="card">
          <h2>{selectedStyle.name}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{selectedStyle.description}</p>

          <div className="form-row">
            <div className="field" style={{ minWidth: 'auto' }}>
              <label>부케</label>
              <p style={{ margin: 0 }}>{selectedStyle.bouquet}</p>
            </div>
            <div className="field" style={{ minWidth: 'auto' }}>
              <label>드레스</label>
              <p style={{ margin: 0 }}>{selectedStyle.dress}</p>
            </div>
            <div className="field" style={{ minWidth: 'auto' }}>
              <label>턱시도</label>
              <p style={{ margin: 0 }}>{selectedStyle.tuxedo}</p>
            </div>
          </div>

          <SongPicker
            label="혼주 입장곡 (선택 또는 직접 입력)"
            options={selectedStyle.parentsEntranceSong}
            value={data.parents_entrance_song_choice}
            onSave={(song) => patch({ parents_entrance_song_choice: song })}
          />
          <SongPicker
            label="신랑 입장곡 (선택 또는 직접 입력)"
            options={selectedStyle.groomEntranceSong}
            value={data.groom_entrance_song_choice}
            onSave={(song) => patch({ groom_entrance_song_choice: song })}
          />
          <SongPicker
            label="신부 입장곡 (선택 또는 직접 입력)"
            options={selectedStyle.entranceSongs}
            value={data.entrance_song_choice}
            onSave={(song) => patch({ entrance_song_choice: song })}
          />
          <SongPicker
            label="축가 (선택 또는 직접 입력)"
            options={selectedStyle.congratulatorySong}
            value={data.congratulatory_song_choice}
            onSave={(song) => patch({ congratulatory_song_choice: song })}
          />
          <SongPicker
            label="퇴장곡 (선택 또는 직접 입력)"
            options={selectedStyle.exitSongs}
            value={data.exit_song_choice}
            onSave={(song) => patch({ exit_song_choice: song })}
          />
        </div>
      )}
    </div>
  );
}
