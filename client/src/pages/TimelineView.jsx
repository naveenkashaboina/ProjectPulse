import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

export default function TimelineView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', dueDate: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, mileRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/milestones`),
      ]);
      setProject(projRes.data.data);
      setMilestones(mileRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/projects/${projectId}/milestones`, newMilestone);
      setMilestones([...milestones, res.data.data]);
      setShowModal(false);
      setNewMilestone({ title: '', description: '', dueDate: '' });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create milestone');
    }
  };

  const handleToggleComplete = async (milestone) => {
    const newStatus = milestone.status === 'completed' ? 'open' : 'completed';
    try {
      const res = await api.put(`/milestones/${milestone._id}`, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : null,
      });
      setMilestones(milestones.map((m) => (m._id === milestone._id ? res.data.data : m)));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId, title) => {
    if (!window.confirm(`Delete milestone "${title}"?`)) return;
    try {
      await api.delete(`/milestones/${milestoneId}`);
      setMilestones(milestones.filter((m) => m._id !== milestoneId));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete milestone');
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="animate-slide-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Timeline & Milestones</h1>
          <p className="page-subtitle">{project?.name} · Track target release milestones</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Milestone
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 32, borderLeft: '2px solid var(--border-emphasis)', margin: 'var(--space-xl) 0 0 16px' }}>
        {milestones.map((m) => {
          const isOverdue = m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'completed';
          const isComplete = m.status === 'completed';

          return (
            <div key={m._id} style={{ position: 'relative', marginBottom: 'var(--space-xl)' }}>
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -41,
                  top: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: isComplete ? 'var(--accent-green)' : isOverdue ? 'var(--accent-red)' : 'var(--primary)',
                  boxShadow: '0 0 0 4px var(--bg-primary)',
                }}
              />

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xs)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.title}
                    </h3>
                    {m.dueDate && (
                      <span style={{ fontSize: 'var(--text-xs)', color: isOverdue ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                        Due: {new Date(m.dueDate).toLocaleDateString()} {isOverdue ? '(Overdue)' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <button
                      className={`btn btn-sm ${isComplete ? 'btn-green' : 'btn-outline'}`}
                      onClick={() => handleToggleComplete(m)}
                    >
                      {isComplete ? '✓ Completed' : 'Mark Complete'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--accent-red)' }}
                      onClick={() => handleDeleteMilestone(m._id, m.title)}
                      title="Delete milestone"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {m.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 8 }}>
                    {m.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {milestones.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No milestones added to this project yet.
          </p>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Milestone</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMilestone}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Milestone Title *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g., MVP Launch"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="3"
                    placeholder="Scope and deliverables for this milestone"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Due Date *</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
