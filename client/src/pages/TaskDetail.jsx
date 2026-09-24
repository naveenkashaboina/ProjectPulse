import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useUiStore from '../stores/uiStore';
import api from '../utils/api';

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);

  const [task, setTask] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectLabels, setProjectLabels] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Comment & file state
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Blocker modal
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');

  // Add dependency
  const [selectedDepId, setSelectedDepId] = useState('');

  const [error, setError] = useState(null);

  const fetchTaskData = useCallback(async () => {
    try {
      setLoading(true);
      const [taskRes, commentsRes, attachmentsRes] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get(`/tasks/${taskId}/comments`),
        api.get(`/tasks/${taskId}/attachments`),
      ]);

      const t = taskRes.data.data;
      setTask(t);
      setEditTitle(t.title);
      setEditDescription(t.description || '');
      setComments(commentsRes.data.data || []);
      setAttachments(attachmentsRes.data.data || []);

      // Fetch project context (other tasks, members, labels)
      const pId = t.project?._id || t.project;
      if (pId) {
        const [projTasksRes, membersRes, labelsRes] = await Promise.all([
          api.get(`/projects/${pId}/tasks?limit=100`),
          api.get(`/projects/${pId}/members`),
          api.get(`/projects/${pId}/labels`),
        ]);
        setProjectTasks((projTasksRes.data.data || []).filter((pt) => pt._id !== taskId));
        setProjectMembers(membersRes.data.data || []);
        setProjectLabels(labelsRes.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  // Update task attributes
  const handleUpdate = async (updates) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, updates);
      setTask((prev) => ({ ...prev, ...res.data.data }));
      addToast({ type: 'success', message: 'Task updated successfully' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Update failed' });
    }
  };

  // Status update
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTask((prev) => ({ ...prev, ...res.data.data, status: newStatus }));
      addToast({ type: 'success', message: `Status updated to ${newStatus}` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Status update failed' });
    }
  };

  // Blocker toggle
  const handleResolveBlocker = async () => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { isBlocked: false, blockReason: '' });
      setTask(res.data.data);
      addToast({ type: 'success', message: 'Blocker resolved!' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to resolve blocker' });
    }
  };

  const handleSetBlocker = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/tasks/${taskId}`, { isBlocked: true, blockReason: blockReasonInput });
      setTask(res.data.data);
      setShowBlockerModal(false);
      setBlockReasonInput('');
      addToast({ type: 'success', message: 'Task marked as blocked' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to set blocker' });
    }
  };

  // Save title/description
  const handleSaveDetails = async () => {
    await handleUpdate({ title: editTitle, description: editDescription });
    setIsEditing(false);
  };

  // Add dependency
  const handleAddDependency = async () => {
    if (!selectedDepId) return;
    const currentDepIds = (task.dependsOn || []).map((d) => (d._id || d));
    if (currentDepIds.includes(selectedDepId)) return;
    await handleUpdate({ dependsOn: [...currentDepIds, selectedDepId] });
    setSelectedDepId('');
    fetchTaskData();
  };

  // Remove dependency
  const handleRemoveDependency = async (depId) => {
    const currentDepIds = (task.dependsOn || []).map((d) => (d._id || d)).filter((id) => id !== depId);
    await handleUpdate({ dependsOn: currentDepIds });
    fetchTaskData();
  };

  // Toggle label
  const handleToggleLabel = async (labelId) => {
    const currentLabelIds = (task.labels || []).map((l) => (l._id || l));
    const nextLabelIds = currentLabelIds.includes(labelId)
      ? currentLabelIds.filter((id) => id !== labelId)
      : [...currentLabelIds, labelId];
    await handleUpdate({ labels: nextLabelIds });
    fetchTaskData();
  };

  // Comments
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setCommentSubmitting(true);
      const res = await api.post(`/tasks/${taskId}/comments`, { body: newComment });
      setComments([...comments, res.data.data]);
      setNewComment('');
      addToast({ type: 'success', message: 'Comment posted' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to post comment' });
    } finally {
      setCommentSubmitting(false);
    }
  };

  // File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const res = await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments([...attachments, res.data.data]);
      addToast({ type: 'success', message: 'File attached successfully' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Upload failed' });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // Delete attachment
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

  // Delete task
  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      addToast({ type: 'success', message: 'Task deleted' });
      const pId = task.project?._id || task.project;
      navigate(`/projects/${pId}/board`);
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to delete task' });
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  if (error || !task) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h3>Task not found</h3>
        <p>{error || 'The requested task could not be retrieved.'}</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const projectId = task.project?._id || task.project;

  return (
    <div className="animate-slide-up" style={{ maxWidth: 1060, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <Link to={`/projects/${projectId}/board`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-xs)' }}>
            ← Back to Kanban Board
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <h1 className="page-title">{task.title}</h1>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(!isEditing)} title="Edit title and description">
              ✏️ Edit
            </button>
          </div>
          <p className="page-subtitle">Project: {task.project?.name || 'Project'}</p>
        </div>
        <div className="page-actions">
          <select
            className="select"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ fontWeight: 600 }}
          >
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="in-review">In Review</option>
            <option value="done">Done</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={handleDeleteTask} style={{ color: 'var(--accent-red)' }} title="Delete task">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Blocker Alert Banner */}
      {task.isBlocked ? (
        <div style={{ padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🚫</span>
              <strong style={{ color: 'var(--accent-red)', fontSize: 'var(--text-sm)' }}>THIS TASK IS CURRENTLY BLOCKED</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              <strong>Reason:</strong> {task.blockReason || 'No specific reason given'}
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleResolveBlocker} style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
            ✓ Resolve Blocker
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBlockerModal(true)} style={{ color: 'var(--accent-amber)' }}>
            ⚠️ Mark as Blocked...
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Left Column: Details, Dependencies, Attachments, Comments */}
        <div>
          {/* Details / Edit card */}
          <div className="card mb-6">
            {isEditing ? (
              <div>
                <div className="input-group">
                  <label>Title</label>
                  <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea className="textarea" rows="4" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveDetails}>Save Changes</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                  Description
                </h3>
                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {task.description || 'No description provided.'}
                </p>
              </div>
            )}
          </div>

          {/* Task Dependencies Section */}
          <div className="card mb-6">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
              Dependencies ({task.dependsOn?.length || 0})
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              Tasks that must be completed before or alongside this task
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
              {(task.dependsOn || []).map((dep) => {
                const isResolved = dep.status === 'done';
                return (
                  <div
                    key={dep._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: isResolved ? '3px solid var(--accent-green)' : '3px solid var(--accent-amber)',
                    }}
                  >
                    <div>
                      <Link to={`/tasks/${dep._id}`} style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {dep.title}
                      </Link>
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        <span className={`badge ${isResolved ? 'badge-green' : 'badge-amber'}`}>
                          {dep.status}
                        </span>
                        {!isResolved && (
                          <span style={{ fontSize: 11, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center' }}>
                            ⚠️ Pending resolution
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveDependency(dep._id)} title="Remove dependency">
                      ✕
                    </button>
                  </div>
                );
              })}

              {(!task.dependsOn || task.dependsOn.length === 0) && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No dependencies configured.</p>
              )}
            </div>

            {/* Add Dependency Input */}
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <select
                className="select"
                value={selectedDepId}
                onChange={(e) => setSelectedDepId(e.target.value)}
                style={{ flex: 1, fontSize: 'var(--text-xs)' }}
              >
                <option value="">Select a project task as dependency...</option>
                {projectTasks
                  .filter((pt) => !(task.dependsOn || []).some((d) => (d._id || d) === pt._id))
                  .map((pt) => (
                    <option key={pt._id} value={pt._id}>
                      {pt.title} ({pt.status})
                    </option>
                  ))}
              </select>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleAddDependency}
                disabled={!selectedDepId}
              >
                + Add Dependency
              </button>
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

          {/* Comments Section */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              Discussion & Activity ({comments.length})
            </h3>
            <form onSubmit={handleCommentSubmit} style={{ marginBottom: 'var(--space-lg)' }}>
              <textarea
                className="input"
                rows="3"
                placeholder="Write a comment... (use @name to mention team members)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ width: '100%', resize: 'vertical', marginBottom: 'var(--space-sm)' }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={commentSubmitting || !newComment.trim()}
              >
                {commentSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {comment.author?.name || 'User'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {comment.body}
                  </p>
                </div>
              ))}
              {comments.length === 0 && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No comments yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Meta Attributes & Editing */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Attributes</h3>

            {/* Priority */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Priority
              </label>
              <select
                className="select"
                value={task.priority}
                onChange={(e) => handleUpdate({ priority: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Story Points */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Story Points
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={task.storyPoints ?? 0}
                  onChange={(e) => setTask({ ...task, storyPoints: parseInt(e.target.value) || 0 })}
                  onBlur={() => handleUpdate({ storyPoints: task.storyPoints })}
                  style={{ width: 100 }}
                />
                <span className="badge badge-primary" style={{ alignSelf: 'center' }}>Points</span>
              </div>
            </div>

            {/* Assignee */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Assignee
              </label>
              <select
                className="select"
                value={task.assignee?._id || task.assignee || ''}
                onChange={(e) => handleUpdate({ assignee: e.target.value || null })}
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

            {/* Due Date */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Due Date
              </label>
              <input
                type="date"
                className="input"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleUpdate({ dueDate: e.target.value || null })}
                style={{ width: '100%' }}
              />
            </div>

            {/* Sprint */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Sprint
              </label>
              <span className="badge badge-purple">
                {task.sprint?.name || 'Backlog'}
              </span>
            </div>

            {/* Labels Management */}
            {projectLabels.length > 0 && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Labels & Tags
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {projectLabels.map((lbl) => {
                    const isSelected = (task.labels || []).some((l) => (l._id || l) === lbl._id);
                    return (
                      <button
                        type="button"
                        key={lbl._id}
                        onClick={() => handleToggleLabel(lbl._id)}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          background: isSelected ? lbl.color : 'transparent',
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                          border: `1px solid ${lbl.color}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {lbl.name} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blocker Modal */}
      {showBlockerModal && (
        <div className="modal-overlay" onClick={() => setShowBlockerModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Mark Task as Blocked</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowBlockerModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSetBlocker}>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                  Highlighting blockers helps Team Leads and PMs prioritize unblocking your work.
                </p>
                <div className="input-group">
                  <label>Blocker Reason *</label>
                  <textarea
                    className="textarea"
                    required
                    rows="3"
                    placeholder="e.g., Awaiting backend API endpoints, or database migration error..."
                    value={blockReasonInput}
                    onChange={(e) => setBlockReasonInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBlockerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-red)' }}>
                  Mark Blocked
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
