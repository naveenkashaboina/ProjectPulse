import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useUiStore from '../stores/uiStore';
import api from '../utils/api';

const ISSUE_STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
  { id: 'wont-fix', label: "Won't Fix" },
];

const SEVERITY_COLORS = {
  critical: 'badge-red',
  high: 'badge-amber',
  medium: 'badge-primary',
  low: 'badge-green',
};

export default function IssueDetail() {
  const { projectId, issueId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);

  const [issue, setIssue] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchIssue = useCallback(async () => {
    try {
      setLoading(true);
      const [issueRes, commRes, attRes] = await Promise.all([
        api.get(`/issues/${issueId}`),
        api.get(`/issues/${issueId}/comments`),
        api.get(`/issues/${issueId}/attachments`),
      ]);
      const iss = issueRes.data.data;
      setIssue(iss);
      setComments(commRes.data.data || []);
      setAttachments(attRes.data.data || []);
      setResolutionText(iss.resolution || '');

      // Fetch project members for assignee dropdown
      const pId = projectId || iss.project?._id || iss.project;
      if (pId) {
        const memRes = await api.get(`/projects/${pId}/members`);
        setProjectMembers(memRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [issueId, projectId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const handleStatusSelect = (newStatus) => {
    setPendingStatus(newStatus);
    setStatusNote('');
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const res = await api.put(`/issues/${issueId}`, {
        status: pendingStatus,
        resolution: resolutionText,
        statusNote,
      });
      setIssue(res.data.data);
      setShowStatusModal(false);
      addToast({ type: 'success', message: `Issue status changed to ${pendingStatus}` });
      fetchIssue();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update issue' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveResolution = async () => {
    try {
      const res = await api.put(`/issues/${issueId}`, { resolution: resolutionText });
      setIssue(res.data.data);
      addToast({ type: 'success', message: 'Resolution notes saved' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to save resolution' });
    }
  };

  const handleAssigneeChange = async (newAssignee) => {
    try {
      const res = await api.put(`/issues/${issueId}`, { assignee: newAssignee || null });
      setIssue(res.data.data);
      addToast({ type: 'success', message: 'Assignee updated' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update assignee' });
    }
  };

  const handleSeverityChange = async (newSeverity) => {
    try {
      const res = await api.put(`/issues/${issueId}`, { severity: newSeverity });
      setIssue(res.data.data);
      addToast({ type: 'success', message: `Severity changed to ${newSeverity}` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update severity' });
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/issues/${issueId}/comments`, { body: newComment });
      setComments([...comments, res.data.data]);
      setNewComment('');
      addToast({ type: 'success', message: 'Comment posted' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to post comment' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const res = await api.post(`/issues/${issueId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments([...attachments, res.data.data]);
      addToast({ type: 'success', message: 'Attachment uploaded successfully' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Upload failed' });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await api.delete(`/attachments/${attId}`);
      setAttachments(attachments.filter((a) => a._id !== attId));
      addToast({ type: 'success', message: 'Attachment deleted' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to delete' });
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;
  if (!issue) return <div className="empty-state"><h3>Issue not found</h3></div>;

  const currentProjectId = projectId || issue.project?._id || issue.project;

  return (
    <div className="animate-slide-up" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>
        ← Back to Issues
      </button>

      <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 className="page-title">{issue.title}</h1>
          <p className="page-subtitle">
            Reported by <strong>{issue.reportedBy?.name || 'User'}</strong> · {new Date(issue.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <select
            className="select"
            value={issue.status}
            onChange={(e) => handleStatusSelect(e.target.value)}
            disabled={updating}
            style={{ fontWeight: 600 }}
          >
            {ISSUE_STATUSES.map((st) => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Left Column: Details, Reproduction, Status History, Attachments, Comments */}
        <div>
          {/* Linked Task badge */}
          {issue.task && (
            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Linked to Task:</span>
              <Link to={`/tasks/${issue.task._id}`} style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--primary-hover)', textDecoration: 'none' }}>
                📋 {issue.task.title} ({issue.task.status})
              </Link>
            </div>
          )}

          {/* Description */}
          <div className="card mb-6">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
              Description
            </h3>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {issue.description || 'No description provided.'}
            </p>
          </div>

          {/* Reproduction Details */}
          {issue.stepsToReproduce && (
            <div className="card mb-6" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                Steps to Reproduce
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {issue.stepsToReproduce}
              </p>
            </div>
          )}

          {/* Resolution Notes */}
          <div className="card mb-6">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
              Resolution Notes
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              Document the fix, root cause analysis, or verification criteria
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <textarea
                className="textarea"
                rows="2"
                placeholder="Explain how the defect was resolved..."
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
              />
              <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={handleSaveResolution}>
                Save Notes
              </button>
            </div>
          </div>

          {/* Status History Timeline */}
          <div className="card mb-6">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              Status History ({issue.statusHistory?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border-emphasis)' }}>
              {(issue.statusHistory || []).map((entry, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -22,
                      top: 4,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>
                      Status set to <span className="badge badge-primary">{entry.status}</span>
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(entry.changedAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    by {entry.changedBy?.name || 'User'}
                    {entry.note && (
                      <span style={{ display: 'block', fontStyle: 'italic', marginTop: 2, color: 'var(--text-muted)' }}>
                        "{entry.note}"
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!issue.statusHistory || issue.statusHistory.length === 0) && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No status history recorded yet.</p>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="card mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Attachments ({attachments.length})</h3>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                {uploadingFile ? 'Uploading...' : '+ Upload File'}
                <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploadingFile} />
              </label>
            </div>
            {attachments.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No attachments uploaded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {attachments.map((att) => (
                  <div
                    key={att._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-sm)',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary-hover)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
                    >
                      📎 {att.fileName}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {(att.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteAttachment(att._id)}
                        style={{ color: 'var(--accent-red)', padding: '2px 6px' }}
                        title="Delete attachment"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discussion */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              Discussion ({comments.length})
            </h3>
            <form onSubmit={handleCommentSubmit} style={{ marginBottom: 'var(--space-md)' }}>
              <textarea
                className="input"
                rows="3"
                placeholder="Add to the conversation... (use @name to mention)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ width: '100%', marginBottom: 'var(--space-sm)' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!newComment.trim()}>
                Post Comment
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {comments.map((c) => (
                <div key={c._id} style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.author?.name || 'User'}</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{c.body}</p>
                </div>
              ))}
              {comments.length === 0 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No comments yet.</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Attributes</h3>

            {/* Severity */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Severity
              </label>
              <select
                className="select"
                value={issue.severity}
                onChange={(e) => handleSeverityChange(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Current Status */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Status
              </label>
              <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                {issue.status}
              </span>
            </div>

            {/* Assignee */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Assignee
              </label>
              <select
                className="select"
                value={issue.assignee?._id || issue.assignee || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m) => (
                  <option key={m.user?._id} value={m.user?._id}>
                    {m.user?.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Reporter */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Reported By
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <div
                  className="avatar avatar-sm"
                  style={{ background: `hsl(${issue.reportedBy?.name?.charCodeAt(0) * 7 % 360}, 60%, 45%)` }}
                >
                  {issue.reportedBy?.name?.charAt(0) || 'U'}
                </div>
                <span style={{ fontSize: 'var(--text-sm)' }}>{issue.reportedBy?.name || 'User'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Change Issue Status</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConfirmStatusChange}>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
                  Moving issue from <span className="badge badge-primary">{issue.status}</span> to{' '}
                  <span className="badge badge-green">{pendingStatus}</span>
                </p>
                <div className="input-group">
                  <label>Status Transition Note (optional)</label>
                  <textarea
                    className="textarea"
                    rows="3"
                    placeholder="e.g., Identified cause in Auth middleware, verified on staging..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Confirm Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
