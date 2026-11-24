import { useState } from 'react';
import { History, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDateTime, timeAgo } from '../../utils/format.js';
import { EmptyState, PageHeader } from '../../components/ui.jsx';

export default function AdminActivity() {
  const { activity } = useApp();
  const [q, setQ] = useState('');
  const list = activity.filter((a) => !q || `${a.text} ${a.by}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Activity log" subtitle="An audit trail of important admin actions and order-status changes." />
      <div className="card">
        <div className="filter-bar">
          <div className="search-box sm"><Search size={16} /><input type="search" placeholder="Search activity" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity" /></div>
          <span className="muted small">{list.length} entries</span>
        </div>
        {list.length === 0 ? <EmptyState icon={History} title="No activity found" /> : (
          <ul className="activity-list">
            {list.map((a) => (
              <li key={a.id}>
                <span className="activity-dot" />
                <div>
                  <div>{a.text}</div>
                  <div className="muted small">{a.by} · <span title={formatDateTime(a.at)}>{timeAgo(a.at)}</span></div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
