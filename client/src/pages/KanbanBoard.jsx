import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useOrgStore from '../stores/orgStore';
import useUiStore from '../stores/uiStore';
import api from '../utils/api';
import '../styles/kanban.css';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'var(--text-muted)' },
  { id: 'todo', label: 'To Do', color: 'var(--accent-cyan)' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--primary-hover)' },
  { id: 'in-review', label: 'In Review', color: 'var(--accent-amber)' },
  { id: 'done', label: 'Done', color: 'var(--accent-green)' },
];

const PRIORITY_COLORS = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  critical: 'priority-critical',
};

const PROJECT_ROLES = ['ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'];

export default function KanbanBoard() {
  const { projectId } = useParams();
  const user = useAuthStore((state) => state.user);
  const setCurrentProject = useOrgStore((state) => state.setCurrentProject);
  const addToast = useUiStore((state) => state.addToast);

  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Mobile active column view & scroll
  const [activeMobileColumn, setActiveMobileColumn] = useState('all');

  const scrollToColumn = (colId) => {
    setActiveMobileColumn(colId);
    const element = document.getElementById(`kanban-col-${colId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  // Filters
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterSprint, setFilterSprint] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Developer');
  const [addingMember, setAddingMember] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'backlog',
    storyPoints: 0,
    assignee: null,
    sprint: null,
    labels: [],
    dueDate: '',
    isBlocked: false,
    blockReason: '',
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [taskRes, projRes, memRes, labelRes, sprintRes] = await Promise.all([
        api.get(`/projects/${projectId}/tasks?limit=200`),
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/members`),
        api.get(`/projects/${projectId}/labels`),
        api.get(`/projects/${projectId}/sprints`),
      ]);
      setTasks(taskRes.data.data || []);
      setProject(projRes.data.data);
      setMembers(memRes.data.data || []);
      setLabels(labelRes.data.data || []);
      setSprints(sprintRes.data.data || []);
      setCurrentProject(projRes.data.data);

      // Fetch org members for adding project members
      if (projRes.data.data?.organization) {
        const orgId = typeof projRes.data.data.organization === 'object'
          ? projRes.data.data.organization._id
          : projRes.data.data.organization;
        try {
          const orgMemRes = await api.get(`/organizations/${orgId}/members`);
          setOrgMembers(orgMemRes.data.data || []);
        } catch {
          /* ignore if unauthorized */
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, setCurrentProject]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Determine user's role on project
  const currentMember = members.find((m) => m.user?._id === user?._id);
  const isPMOrAdmin = currentMember?.role === 'ProjectManager' || currentMember?.role === 'OrgAdmin' || user?.role === 'OrgAdmin';

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task._id);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleUpdateTaskStatus = async (task, newStatus) => {
    if (!task || task.status === newStatus) return;

    const oldStatus = task.status;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
      addToast({ type: 'success', message: `"${task.title}" moved to ${newStatus}` });
    } catch (err) {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: oldStatus } : t))
      );
      addToast({ type: 'error', message: 'Failed to update task status. Reverted.' });
    }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === newStatus) return;
    await handleUpdateTaskStatus(draggedTask, newStatus);
  };

  // Create task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newTask,
        dueDate: newTask.dueDate || null,
        assignee: newTask.assignee || null,
        sprint: newTask.sprint || null,
      };
      const res = await api.post(`/projects/${projectId}/tasks`, payload);
      setTasks([...tasks, res.data.data]);
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'backlog',
        storyPoints: 0,
        assignee: null,
        sprint: null,
        labels: [],
        dueDate: '',
        isBlocked: false,
        blockReason: '',
      });
      addToast({ type: 'success', message: 'Task created successfully' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to create task' });
    }
  };

  // Project member management
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberUserId) return;
    try {
      setAddingMember(true);
      const res = await api.post(`/projects/${projectId}/members`, {
        userId: newMemberUserId,
        role: newMemberRole,
      });
      setMembers([...members, res.data.data]);
      setNewMemberUserId('');
      addToast({ type: 'success', message: 'Member added to project' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to add member' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberUserId}`);
      setMembers(members.filter((m) => m.user?._id !== memberUserId));
      addToast({ type: 'success', message: `${memberName} removed from project` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to remove member' });
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filterPriority && task.priority !== filterPriority) return false;
    if (filterAssignee && task.assignee?._id !== filterAssignee) return false;
    if (filterSprint && (task.sprint?._id || task.sprint) !== filterSprint) return false;
    if (filterLabel && !task.labels?.some((l) => (l._id || l) === filterLabel)) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getColumnTasks = (status) => filteredTasks.filter((t) => t.status === status);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  // Find org members not yet in project
  const nonProjectOrgMembers = orgMembers.filter(
    (om) => !members.some((pm) => pm.user?._id === om.user?._id)
  );

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">{project?.name || 'Board'}</h1>
          <p className="page-subtitle">Kanban Board · {tasks.length} tasks</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => setShowMembersModal(true)}>
            👥 Members ({members.length})
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Task
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <select className="select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="select" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="">All Assignees</option>
          {members.map((m) => (
            <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
          ))}
        </select>
        {sprints.length > 0 && (
          <select className="select" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
            <option value="">All Sprints</option>
            {sprints.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
            ))}
          </select>
        )}
        {labels.length > 0 && (
          <select className="select" value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)}>
            <option value="">All Labels</option>
            {labels.map((l) => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Mobile Column Navigation Tabs */}
      <div className="kanban-mobile-tabs">
        <button
          type="button"
          className={`kanban-mobile-tab ${activeMobileColumn === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveMobileColumn('all');
            const board = document.getElementById('kanban-board-track');
            if (board) board.scrollTo({ left: 0, behavior: 'smooth' });
          }}
        >
          <span>All Columns</span>
          <span className="kanban-tab-count">{filteredTasks.length}</span>
        </button>
        {COLUMNS.map((col) => (
          <button
            key={col.id}
            type="button"
            className={`kanban-mobile-tab ${activeMobileColumn === col.id ? 'active' : ''}`}
            onClick={() => scrollToColumn(col.id)}
          >
            <span className="kanban-column-dot" style={{ background: col.color }}></span>
            <span>{col.label}</span>
            <span className="kanban-tab-count">{getColumnTasks(col.id).length}</span>
          </button>
        ))}
      </div>

      <div className="kanban-board" id="kanban-board-track">
        {COLUMNS.map((col) => {
          const columnTasks = getColumnTasks(col.id);
          return (
            <div
              id={`kanban-col-${col.id}`}
              key={col.id}
              className={`kanban-column ${dragOverColumn === col.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className="kanban-column-dot" style={{ background: col.color }}></span>
                  {col.label}
                </div>
                <span className="kanban-column-count">{columnTasks.length}</span>
              </div>
              <div className="kanban-column-body">
                {columnTasks.map((task) => (
                  <div
                    key={task._id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    style={{
                      borderLeft: task.isBlocked ? '3px solid var(--accent-red)' : undefined,
                    }}
                  >
                    <Link to={`/tasks/${task._id}`} className="kanban-card-title">
                      {task.title}
                    </Link>

                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0 2px' }}>
                        {task.labels.map((lbl) => (
                          <span
                            key={lbl._id || lbl}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: lbl.color ? `${lbl.color}25` : 'var(--bg-elevated)',
                              color: lbl.color || 'var(--text-secondary)',
                              border: `1px solid ${lbl.color || 'var(--border-subtle)'}`,
                            }}
                          >
                            {lbl.name || 'Label'}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="kanban-card-meta">
                      <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      {task.storyPoints > 0 && <span className="badge badge-primary">{task.storyPoints} pts</span>}
                      {task.isBlocked && (
                        <span className="badge badge-red" title={task.blockReason || 'Blocked'}>
                          🚫 Blocked
                        </span>
                      )}
                    </div>

                    <div className="kanban-card-footer">
                      {task.assignee ? (
                        <div className="kanban-card-assignee">
                          <div
                            className="avatar avatar-sm"
                            style={{ background: `hsl(${task.assignee.name?.charCodeAt(0) * 7 % 360}, 60%, 45%)` }}
                          >
                            {task.assignee.name?.charAt(0)}
                          </div>
                          <span>{task.assignee.name?.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                      {task.dueDate && (
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'var(--accent-red)' : 'var(--text-muted)',
                            fontWeight: new Date(task.dueDate) < new Date() && task.status !== 'done' ? 600 : 400,
                          }}
                        >
                          📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Touch / Mobile Quick Move */}
                    <div className="kanban-card-quick-move" onClick={(e) => e.stopPropagation()}>
                      <label htmlFor={`quick-move-${task._id}`}>Move:</label>
                      <select
                        id={`quick-move-${task._id}`}
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task, e.target.value)}
                        aria-label={`Change status for ${task.title}`}
                      >
                        {COLUMNS.map((colOption) => (
                          <option key={colOption.id} value={colOption.id}>
                            {colOption.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="kanban-empty">No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2>Create Task</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="input-group">
                  <label>Title *</label>
                  <input
                    className="input"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    className="textarea"
                    rows="3"
                    placeholder="Describe the task and acceptance criteria..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label>Priority</label>
                    <select
                      className="select"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Story Points</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      value={newTask.storyPoints}
                      onChange={(e) => setNewTask({ ...newTask, storyPoints: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label>Status</label>
                    <select
                      className="select"
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Assignee</label>
                    <select
                      className="select"
                      value={newTask.assignee || ''}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user?._id} value={m.user?._id}>{m.user?.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label>Sprint</label>
                    <select
                      className="select"
                      value={newTask.sprint || ''}
                      onChange={(e) => setNewTask({ ...newTask, sprint: e.target.value || null })}
                    >
                      <option value="">Backlog (No Sprint)</option>
                      {sprints.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Due Date</label>
                    <input
                      className="input"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Labels selection */}
                {labels.length > 0 && (
                  <div className="input-group">
                    <label>Labels</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {labels.map((lbl) => {
                        const selected = newTask.labels.includes(lbl._id);
                        return (
                          <button
                            type="button"
                            key={lbl._id}
                            onClick={() => {
                              setNewTask({
                                ...newTask,
                                labels: selected
                                  ? newTask.labels.filter((id) => id !== lbl._id)
                                  : [...newTask.labels, lbl._id],
                              });
                            }}
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              background: selected ? lbl.color : 'transparent',
                              color: selected ? '#fff' : 'var(--text-primary)',
                              border: `1px solid ${lbl.color}`,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {lbl.name} {selected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Blocker settings */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={newTask.isBlocked}
                      onChange={(e) => setNewTask({ ...newTask, isBlocked: e.target.checked })}
                    />
                    <span>Mark as Blocked</span>
                  </label>
                  {newTask.isBlocked && (
                    <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                      <input
                        className="input"
                        placeholder="Reason for blocker (e.g. Waiting on API spec)..."
                        value={newTask.blockReason}
                        onChange={(e) => setNewTask({ ...newTask, blockReason: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Members Modal */}
      {showMembersModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowMembersModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>Project Members ({members.length})</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMembersModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Add member section (for PM / Admin) */}
              {isPMOrAdmin && (
                <form onSubmit={handleAddMember} style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                    Add Team Member to Project
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 'var(--space-xs)' }}>
                    <select
                      className="select"
                      value={newMemberUserId}
                      onChange={(e) => setNewMemberUserId(e.target.value)}
                      required
                    >
                      <option value="">Select org user...</option>
                      {nonProjectOrgMembers.map((m) => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name} ({m.role})
                        </option>
                      ))}
                    </select>
                    <select
                      className="select"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                    >
                      {PROJECT_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={addingMember || !newMemberUserId}>
                      {addingMember ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {members.map((m) => (
                  <div
                    key={m._id || m.user?._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div
                        className="avatar avatar-sm"
                        style={{ background: `hsl(${m.user?.name?.charCodeAt(0) * 7 % 360}, 60%, 45%)` }}
                      >
                        {m.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{m.user?.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{m.user?.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <span className="badge badge-primary">{m.role}</span>
                      {isPMOrAdmin && m.user?._id !== user?._id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-red)', padding: '2px 6px' }}
                          onClick={() => handleRemoveMember(m.user?._id, m.user?.name)}
                          title="Remove from project"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMembersModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
