import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useOrgStore from '../stores/orgStore';
import useUiStore from '../stores/uiStore';
import api from '../utils/api';

const ORG_ROLES = ['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'];

export default function OrgDashboard() {
  const { orgId } = useParams();
  const user = useAuthStore((state) => state.user);
  const organizations = useAuthStore((state) => state.organizations);
  const currentOrg = useOrgStore((state) => state.currentOrg);
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);
  const addToast = useUiStore((state) => state.addToast);

  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Developer' });
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [inviting, setInviting] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', description: '', lead: '', members: [] });
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  const activeOrg = organizations.find((o) => o._id === orgId) || currentOrg;
  const userRole = activeOrg?.role || 'Developer';
  const isAdmin = userRole === 'OrgAdmin';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, memRes, teamRes, orgRes] = await Promise.all([
        api.get(`/organizations/${orgId}/projects?limit=20`),
        api.get(`/organizations/${orgId}/members`),
        api.get(`/organizations/${orgId}/teams`),
        api.get(`/organizations/${orgId}`),
      ]);
      setProjects(projRes.data.data || []);
      setMembers(memRes.data.data || []);
      setTeams(teamRes.data.data || []);
      setOrgData(orgRes.data.data);
      if (orgRes.data.data) {
        setCurrentOrg({ ...orgRes.data.data, role: userRole });
        setSettingsForm({
          name: orgRes.data.data.name || '',
          description: orgRes.data.data.description || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgId, setCurrentOrg, userRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invite member
  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      setInviting(true);
      const res = await api.post(`/organizations/${orgId}/invitations`, inviteForm);
      const token = res.data.data?.inviteToken;
      if (token) {
        const link = `${window.location.origin}/invitations/${token}/accept`;
        setGeneratedInviteLink(link);
      }
      addToast({ type: 'success', message: `Invitation sent to ${inviteForm.email}` });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to send invite' });
    } finally {
      setInviting(false);
    }
  };

  // Change member role
  const handleRoleChange = async (memberUserId, newRole) => {
    try {
      await api.put(`/organizations/${orgId}/members/${memberUserId}/role`, { role: newRole });
      setMembers(members.map((m) => (m.user?._id === memberUserId ? { ...m, role: newRole } : m)));
      addToast({ type: 'success', message: 'Member role updated' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update role' });
    }
  };

  // Remove member
  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) return;
    try {
      await api.delete(`/organizations/${orgId}/members/${memberUserId}`);
      setMembers(members.filter((m) => m.user?._id !== memberUserId));
      addToast({ type: 'success', message: `${memberName} removed from organization` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to remove member' });
    }
  };

  // Create team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      setCreatingTeam(true);
      const payload = {
        name: teamForm.name,
        description: teamForm.description,
        lead: teamForm.lead || undefined,
        members: teamForm.members,
      };
      const res = await api.post(`/organizations/${orgId}/teams`, payload);
      setTeams([...teams, res.data.data]);
      setShowTeamModal(false);
      setTeamForm({ name: '', description: '', lead: '', members: [] });
      addToast({ type: 'success', message: `Team "${teamForm.name}" created` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to create team' });
    } finally {
      setCreatingTeam(false);
    }
  };

  // Update org settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await api.put(`/organizations/${orgId}`, settingsForm);
      setOrgData(res.data.data);
      setShowSettingsModal(false);
      addToast({ type: 'success', message: 'Organization updated successfully' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update organization' });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">{orgData?.name || 'Organization Dashboard'}</h1>
          <p className="page-subtitle">{orgData?.description || 'Agile Project & Team Collaboration Workspace'}</p>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setShowSettingsModal(true)}>
                ⚙️ Settings
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowTeamModal(true)}>
                + New Team
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setGeneratedInviteLink(''); setShowInviteModal(true); }}>
                ✉️ Invite Member
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <span className="stat-card-label">Active Projects</span>
          <span className="stat-card-value" style={{ color: 'var(--primary-hover)' }}>{activeProjects.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Team Members</span>
          <span className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>{members.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Functional Teams</span>
          <span className="stat-card-value" style={{ color: 'var(--accent-purple)' }}>{teams.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Your Role</span>
          <span className="stat-card-value" style={{ fontSize: 'var(--text-lg)', color: 'var(--accent-amber)' }}>
            {userRole}
          </span>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Recent Projects */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Active Projects ({activeProjects.length})</h2>
            <Link to={`/orgs/${orgId}/projects`} className="btn btn-ghost btn-sm">View All Projects →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {activeProjects.length === 0 ? (
              <div className="empty-state">
                <p>No active projects yet</p>
                <Link to={`/orgs/${orgId}/projects`} className="btn btn-primary btn-sm">Create Project</Link>
              </div>
            ) : (
              activeProjects.map((project) => (
                <Link key={project._id} to={`/projects/${project._id}/board`} className="card card-interactive" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{project.name}</h3>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                        {project.description ? project.description.substring(0, 80) + '...' : 'No description'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      {project.team?.name && <span className="badge badge-purple">{project.team.name}</span>}
                      <span className={`badge ${project.status === 'active' ? 'badge-green' : 'badge-amber'}`}>{project.status}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Organization Members with Admin Role Management */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Members & Roles ({members.length})</h2>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => { setGeneratedInviteLink(''); setShowInviteModal(true); }}>
                + Invite
              </button>
            )}
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: 420, overflowY: 'auto' }}>
            {members.map((m) => {
              const isOwner = orgData?.owner === m.user?._id || orgData?.owner?._id === m.user?._id;
              const isSelf = user?._id === m.user?._id;

              return (
                <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="avatar avatar-sm" style={{ background: `hsl(${m.user?.name?.charCodeAt(0) * 7 % 360}, 60%, 45%)` }}>
                    {m.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {m.user?.name} {isSelf && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{m.user?.email}</div>
                  </div>

                  {isAdmin && !isOwner && !isSelf ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <select
                        className="select"
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user?._id, e.target.value)}
                        style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                      >
                        {ORG_ROLES.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--accent-red)', padding: '4px 8px' }}
                        onClick={() => handleRemoveMember(m.user?._id, m.user?.name)}
                        title="Remove member"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className={`badge ${isOwner ? 'badge-amber' : 'badge-primary'}`}>
                      {isOwner ? 'Owner' : m.role}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Teams Management Section */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Functional Teams ({teams.length})</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Cross-functional groups mapped across projects</p>
          </div>
          {isAdmin && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowTeamModal(true)}>
              + Create Team
            </button>
          )}
        </div>

        <div className="grid-3">
          {teams.map((team) => (
            <div key={team._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{team.name}</h3>
                <span className="badge badge-purple">{team.members?.length || 0} members</span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', minHeight: 32 }}>
                {team.description || 'No description provided'}
              </p>
              {team.lead && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  👑 <strong>Team Lead:</strong> {team.lead?.name || 'Assigned Lead'}
                </div>
              )}
            </div>
          ))}

          {teams.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <p>No teams created yet.</p>
              {isAdmin && <button className="btn btn-primary btn-sm mt-2" onClick={() => setShowTeamModal(true)}>Create Team</button>}
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Invite Member to Organization</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            {generatedInviteLink ? (
              <div className="modal-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 'var(--space-sm)' }}>🎉</div>
                <h3 style={{ marginBottom: 'var(--space-xs)' }}>Invitation Sent!</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                  An invitation has been generated for <strong>{inviteForm.email}</strong> as <strong>{inviteForm.role}</strong>.
                </p>
                <div className="input-group">
                  <label>Shareable Invitation Link (Dev/Preview):</label>
                  <input className="input" readOnly value={generatedInviteLink} style={{ fontSize: 'var(--text-xs)' }} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteLink);
                      addToast({ type: 'success', message: 'Invite link copied to clipboard!' });
                    }}
                  >
                    📋 Copy Link
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setGeneratedInviteLink(''); setShowInviteModal(false); }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div className="modal-body">
                  <div className="input-group">
                    <label>Email Address *</label>
                    <input
                      className="input"
                      type="email"
                      required
                      placeholder="colleague@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Organization Role *</label>
                    <select
                      className="select"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    >
                      {ORG_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Invited users can immediately access projects assigned to their teams or roles.
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={inviting}>
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTeamModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Create Functional Team</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTeamModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Team Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g., Core Backend Team, Mobile Guild"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    className="textarea"
                    rows="2"
                    placeholder="Describe team focus and responsibilities..."
                    value={teamForm.description}
                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Team Lead</label>
                  <select
                    className="select"
                    value={teamForm.lead}
                    onChange={(e) => setTeamForm({ ...teamForm, lead: e.target.value })}
                  >
                    <option value="">Select team lead (optional)</option>
                    {members.map((m) => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeamModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingTeam}>
                  {creatingTeam ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Org Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Organization Settings</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Organization Name *</label>
                  <input
                    className="input"
                    required
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    className="textarea"
                    rows="3"
                    value={settingsForm.description}
                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
