import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

const ACTION_ICONS = {
  created: '✨',
  updated: '✏️',
  status_change: '🔄',
  deleted: '🗑️',
  commented: '💬',
  member_added: '👤',
};

export default function ActivityFeed() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, actRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/activity?limit=100`),
      ]);
      setProject(projRes.data.data);
      setActivities(actRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="animate-slide-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Activity Feed</h1>
          <p className="page-subtitle">{project?.name} · Audit log of all recent project events</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {activities.map((act) => (
            <div
              key={act._id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)',
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                {ACTION_ICONS[act.action] || '📌'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {act.actor?.name || 'System'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 500, color: 'var(--primary-hover)' }}>
                    {act.action.replace('_', ' ')}
                  </span>{' '}
                  {act.entityType} {act.metadata?.title ? `"${act.metadata.title}"` : ''}
                </p>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>
              No recorded activity for this project yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
