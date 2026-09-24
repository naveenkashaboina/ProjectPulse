import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function BacklogView() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', startDate: '', endDate: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, taskRes, sprintRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks?limit=200`),
        api.get(`/projects/${projectId}/sprints`),
      ]);
      setProject(projRes.data.data);
      setTasks(taskRes.data.data || []);
      setSprints(sprintRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/projects/${projectId}/sprints`, newSprint);
      setSprints([...sprints, res.data.data]);
      setShowSprintModal(false);
      setNewSprint({ name: '', goal: '', startDate: '', endDate: '' });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create sprint');
    }
  };

  const handleMoveToSprint = async (taskId, sprintId) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { sprint: sprintId || null });
      setTasks(tasks.map((t) => (t._id === taskId ? res.data.data : t)));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update sprint assignment');
    }
  };

  const handleSprintStatus = async (sprintId, status) => {
    try {
      const res = await api.put(`/sprints/${sprintId}`, { status });
      setSprints(sprints.map((s) => (s._id === sprintId ? res.data.data : s)));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update sprint');
    }
  };

  const handleDeleteSprint = async (sprintId, sprintName) => {
    if (!window.confirm(`Delete sprint "${sprintName}"? Tasks will be moved back to backlog.`)) return;
    try {
      await api.delete(`/sprints/${sprintId}`);
      setSprints(sprints.filter((s) => s._id !== sprintId));
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete sprint');
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  const backlogTasks = tasks.filter((t) => !t.sprint);

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Backlog & Sprint Planning</h1>
          <p className="page-subtitle">{project?.name} · Plan upcoming iterations</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowSprintModal(true)}>
            + Create Sprint
          </button>
        </div>
      </div>

      {/* Sprints Section */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
          Active & Planned Sprints ({sprints.length})
        </h2>
        {sprints.map((sprint) => {
          const sprintTasks = tasks.filter((t) => t.sprint?._id === sprint._id || t.sprint === sprint._id);
          const totalPoints = sprintTasks.reduce((acc, curr) => acc + (curr.storyPoints || 0), 0);
          return (
            <div key={sprint._id} className="card mb-6" style={{ borderLeft: sprint.status === 'active' ? '4px solid var(--primary)' : '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, display: 'inline', marginRight: 8 }}>
                    {sprint.name}
                  </h3>
                  <span className={`badge ${sprint.status === 'active' ? 'badge-primary' : sprint.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                    {sprint.status}
                  </span>
                  {sprint.goal && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>Goal: {sprint.goal}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span className="badge badge-primary">{totalPoints} Story Points</span>
                  {sprint.status === 'planned' && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleSprintStatus(sprint._id, 'active')}>
                      Start Sprint
                    </button>
                  )}
                  {sprint.status === 'active' && (
                    <button className="btn btn-green btn-sm" onClick={() => handleSprintStatus(sprint._id, 'completed')}>
                      Complete Sprint
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--accent-red)' }}
                    onClick={() => handleDeleteSprint(sprint._id, sprint.name)}
                    title="Delete sprint"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {sprintTasks.map((task) => (
                  <div key={task._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <Link to={`/tasks/${task._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {task.title}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className="badge badge-primary">{task.storyPoints || 0} pts</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleMoveToSprint(task._id, null)} title="Move back to backlog">
                        ↩ Backlog
                      </button>
                    </div>
                  </div>
                ))}
                {sprintTasks.length === 0 && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-sm)' }}>
                    No tasks assigned to this sprint. Move items from backlog below.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Backlog Section */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
          Backlog Items ({backlogTasks.length})
        </h2>
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {backlogTasks.map((task) => (
              <div key={task._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <Link to={`/tasks/${task._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                    {task.title}
                  </Link>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span className="badge badge-amber">{task.priority}</span>
                    <span className="badge badge-primary">{task.storyPoints || 0} pts</span>
                  </div>
                </div>
                {sprints.length > 0 && (
                  <select
                    className="select"
                    style={{ maxWidth: 180, fontSize: 'var(--text-xs)' }}
                    value=""
                    onChange={(e) => handleMoveToSprint(task._id, e.target.value)}
                  >
                    <option value="" disabled>Assign to sprint...</option>
                    {sprints.filter(s => s.status !== 'completed').map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            {backlogTasks.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-md)' }}>
                Backlog is empty! All items are assigned to sprints.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal to create Sprint */}
      {showSprintModal && (
        <div className="modal-overlay" onClick={() => setShowSprintModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Sprint</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSprintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSprint}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Sprint Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g., Sprint 4 - Checkout Flow"
                    value={newSprint.name}
                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Sprint Goal</label>
                  <input
                    className="input"
                    placeholder="e.g., Complete Stripe integration and invoice generation"
                    value={newSprint.goal}
                    onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="label">Start Date</label>
                    <input
                      type="date"
                      className="input"
                      value={newSprint.startDate}
                      onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">End Date</label>
                    <input
                      type="date"
                      className="input"
                      value={newSprint.endDate}
                      onChange={(e) => setNewSprint({ ...newSprint, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSprintModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
