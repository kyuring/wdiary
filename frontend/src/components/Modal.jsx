export default function Modal({ title, onClose, children, maxWidth }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={maxWidth ? { maxWidth } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
