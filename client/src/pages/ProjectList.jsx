import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useOrgStore from '../stores/orgStore';
import useUiStore from '../stores/uiStore';
import api from '../utils/api';

export default function ProjectList() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);
  const addToast = useUiStore((state) => state.addToast);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', prefix: '', team: '', startDate: '', endDate: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, teamRes] = await Promise.all([
          api.get(`/organizations/${orgId}/projects`),
          api.get(`/organizations/${orgId}/teams`),
        ]);
        setProjects(projRes.data.data || []);
        setTeams(teamRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orgId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description,
        prefix: form.prefix ? form.prefix.toUpperCase() : undefined,
        team: form.team || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      const res = await api.post(`/organizations/${orgId}/projects`, payload);
      setProjects([res.data.data, ...projects]);
      setShowCreate(false);
      setForm({ name: '', description: '', prefix: '', team: '', startDate: '', endDate: '' });
      addToast({ type: 'success', message: `Project "${form.name}" created successfully` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to create project' });
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} projects in this organization</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Create Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Project Name</label>
                  <input className="input" placeholder="e.g., Phoenix Platform" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea className="textarea" placeholder="Describe the project..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label>Prefix (Key)</label>
                    <input className="input" placeholder="e.g., PHX" maxLength={6} value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="input-group">
                    <label>Assigned Team</label>
                    <select className="select" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
                      <option value="">Select team (optional)</option>
                      {teams.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label>Start Date</label>
                    <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>End Date</label>
                    <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid-3">
        {projects.map((project) => (
          <Link key={project._id} to={`/projects/${project._id}/board`} className="card card-interactive" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{project.name}</h3>
              <span className={`badge ${project.status === 'active' ? 'badge-green' : project.status === 'archived' ? 'badge-amber' : 'badge-purple'}`}>
                {project.status}
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {project.description || 'No description'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</span>
              <span>{project.prefix || '—'}</span>
            </div>
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
          <div className="empty-state-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
        </div>
      )}
    </div>
  );
}
