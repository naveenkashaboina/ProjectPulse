import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

export default function WorkloadDashboard() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedSprint
        ? `/projects/${projectId}/workload?sprint=${selectedSprint}`
        : `/projects/${projectId}/workload`;

      const [projRes, sprintRes, loadRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/sprints`),
        api.get(url),
      ]);

      setProject(projRes.data.data);
      setSprints(sprintRes.data.data || []);
      setWorkload(loadRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load workload data');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSprint]);

  useEffect(() => {
    fetchWorkload();
  }, [fetchWorkload]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Workload</h1>
          <p className="page-subtitle">{project?.name} · Active story points & task distribution</p>
        </div>
        <div className="page-actions">
          <select
            className="select"
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
          >
            <option value="">All Sprints</option>
            {sprints.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Access Restricted</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {workload.map((item, idx) => {
            const assigneeName = item.assignee?.name || 'Unassigned';
            const totalPoints = item.totalStoryPoints || 0;
            const isOverloaded = totalPoints > 20;

            return (
              <div
                key={item.assignee?._id || idx}
                className="card"
                style={{
                  borderTop: isOverloaded ? '4px solid var(--accent-red)' : '4px solid var(--primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div
                      className="avatar avatar-md"
                      style={{
                        background: item.assignee?.name
                          ? `hsl(${item.assignee.name.charCodeAt(0) * 7 % 360}, 60%, 45%)`
                          : 'var(--bg-elevated)',
                      }}
                    >
                      {assigneeName.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{assigneeName}</h3>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {item.assignee?.email || 'Tasks pending assignment'}
                      </p>
                    </div>
                  </div>
                  {isOverloaded && (
                    <span className="badge badge-red" title="Exceeds recommended 20 story points threshold">
                      Overloaded
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', margin: 'var(--space-md) 0' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.taskCount}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active Tasks</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: isOverloaded ? 'var(--accent-red)' : 'var(--primary-hover)' }}>
                      {totalPoints}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Story Points</div>
                  </div>
                </div>

                {/* Capacity progress bar (scale out of 25 points) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Capacity (Max: 20 pts)</span>
                    <span>{Math.round((totalPoints / 20) * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (totalPoints / 20) * 100)}%`,
                        background: isOverloaded ? 'var(--accent-red)' : 'var(--primary)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {workload.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <p>No active tasks found for workload analysis.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
