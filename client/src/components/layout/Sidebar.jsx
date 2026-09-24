import { NavLink, useParams, useNavigate } from 'react-router-dom';
import useOrgStore from '../../stores/orgStore';
import useAuthStore from '../../stores/authStore';
import useUiStore from '../../stores/uiStore';

export default function Sidebar() {
  const navigate = useNavigate();
  const { orgId, projectId } = useParams();
  const user = useAuthStore((state) => state.user);
  const organizations = useAuthStore((state) => state.organizations);
  const logout = useAuthStore((state) => state.logout);
  const currentOrg = useOrgStore((state) => state.currentOrg);
  const currentProject = useOrgStore((state) => state.currentProject);
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);
  const clearOrgContext = useOrgStore((state) => state.clearOrgContext);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const closeSidebar = useUiStore((state) => state.closeSidebar);

  const activeOrg = currentOrg || organizations[0];
  const orgRole = activeOrg?.role || 'Developer';

  const handleOrgChange = (e) => {
    const org = organizations.find((o) => o._id === e.target.value);
    if (org) {
      setCurrentOrg(org);
      clearOrgContext();
      navigate(`/orgs/${org._id}/dashboard`);
      closeSidebar();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? 'active' : ''}`;

  const effectiveOrgId = orgId || activeOrg?._id;

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">P</div>
          <h1>ProjectPulse</h1>
        </div>

        {organizations.length > 0 && (
          <select
            className="sidebar-org-select"
            value={activeOrg?._id || ''}
            onChange={handleOrgChange}
            aria-label="Select organization"
          >
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name} ({org.role})
              </option>
            ))}
          </select>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Overview</div>
          <nav className="sidebar-nav">
            {effectiveOrgId && (
              <>
                <NavLink to={`/orgs/${effectiveOrgId}/dashboard`} className={getLinkClass} onClick={closeSidebar}>
                  <span className="icon">📊</span> Dashboard
                </NavLink>
                <NavLink to={`/orgs/${effectiveOrgId}/projects`} className={getLinkClass} onClick={closeSidebar}>
                  <span className="icon">📁</span> Projects
                </NavLink>
              </>
            )}
            <NavLink to="/notifications" className={getLinkClass} onClick={closeSidebar}>
              <span className="icon">🔔</span> Notifications
            </NavLink>
          </nav>
        </div>

        {(currentProject || projectId) && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              {currentProject?.name || 'Current Project'}
            </div>
            <nav className="sidebar-nav">
              <NavLink to={`/projects/${projectId || currentProject?._id}/board`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">📋</span> Board
              </NavLink>
              <NavLink to={`/projects/${projectId || currentProject?._id}/backlog`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">📝</span> Backlog
              </NavLink>
              <NavLink to={`/projects/${projectId || currentProject?._id}/timeline`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">📅</span> Timeline
              </NavLink>
              <NavLink to={`/projects/${projectId || currentProject?._id}/workload`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">⚡</span> Workload
              </NavLink>
              <NavLink to={`/projects/${projectId || currentProject?._id}/issues`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">🐛</span> Issues
              </NavLink>
              <NavLink to={`/projects/${projectId || currentProject?._id}/reports`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">📈</span> Reports
              </NavLink>
              <NavLink to={`/projects/${projectId || currentProject?._id}/activity`} className={getLinkClass} onClick={closeSidebar}>
                <span className="icon">🕐</span> Activity
              </NavLink>
            </nav>
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar avatar-md" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' }}>
              {user?.name?.charAt(0)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{orgRole}</div>
            </div>
            <button
              className="sidebar-logout-tag"
              onClick={handleLogout}
              title="Sign out of ProjectPulse"
              aria-label="Logout"
            >
              <span className="logout-icon" aria-hidden="true">🚪</span>
              <span className="logout-tag">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
