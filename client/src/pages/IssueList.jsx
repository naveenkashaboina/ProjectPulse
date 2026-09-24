import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

const SEVERITY_COLORS = {
  critical: 'badge-red',
  high: 'badge-amber',
  medium: 'badge-primary',
  low: 'badge-green',
};

export default function IssueList() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    severity: 'medium',
    stepsToReproduce: '',
  });

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, issueRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/issues`),
      ]);
      setProject(projRes.data.data);
      setIssues(issueRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/projects/${projectId}/issues`, newIssue);
      setIssues([res.data.data, ...issues]);
      setShowModal(false);
      setNewIssue({ title: '', description: '', severity: 'medium', stepsToReproduce: '' });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to file issue');
    }
  };

  const filteredIssues = issues.filter((iss) => {
    if (filterSeverity && iss.severity !== filterSeverity) return false;
    if (filterStatus && iss.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Issue Tracker</h1>
          <p className="page-subtitle">{project?.name} · Bugs, defects, and regressions</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Report Issue
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="select" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="wont-fix">Won't Fix</option>
        </select>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {filteredIssues.map((issue) => (
            <div
              key={issue._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-md)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${issue.severity === 'critical' ? 'var(--accent-red)' : 'var(--border-subtle)'}`,
              }}
            >
              <div>
                <Link
                  to={`/projects/${projectId}/issues/${issue._id}`}
                  style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-md)' }}
                >
                  {issue.title}
                </Link>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 6, alignItems: 'center' }}>
                  <span className={`badge ${SEVERITY_COLORS[issue.severity] || 'badge-primary'}`}>
                    {issue.severity}
                  </span>
                  <span className="badge badge-primary">{issue.status}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Reported by {issue.reportedBy?.name || 'User'}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Link to={`/projects/${projectId}/issues/${issue._id}`} className="btn btn-outline btn-sm">
                  View Issue →
                </Link>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>
              No issues matching criteria.
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Report New Issue</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Issue Title *</label>
                  <input
                    className="input"
                    required
                    placeholder="Short summary of the bug"
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Severity *</label>
                  <select
                    className="select"
                    value={newIssue.severity}
                    onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Description *</label>
                  <textarea
                    className="input"
                    rows="3"
                    required
                    placeholder="What happened vs what was expected?"
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Steps to Reproduce</label>
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="1. Go to page... 2. Click button..."
                    value={newIssue.stepsToReproduce}
                    onChange={(e) => setNewIssue({ ...newIssue, stepsToReproduce: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">File Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
