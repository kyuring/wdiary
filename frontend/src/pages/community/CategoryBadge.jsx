import { CATEGORY_BADGE_CLASS } from './helpers.js';

export default function CategoryBadge({ category }) {
  return <span className={`badge ${CATEGORY_BADGE_CLASS[category] || 'badge-neutral'}`}>{category}</span>;
}
