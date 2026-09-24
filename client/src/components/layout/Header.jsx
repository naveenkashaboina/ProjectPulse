import { useNavigate } from 'react-router-dom';
import useUiStore from '../../stores/uiStore';
import useOrgStore from '../../stores/orgStore';
import useNotificationStore from '../../stores/notificationStore';
import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';

export default function Header() {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const currentProject = useOrgStore((state) => state.currentProject);

  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const items = useNotificationStore((state) => state.items);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside handlers
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    if (!currentProject?._id) {
      setShowSearchResults(true);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get(`/projects/${currentProject._id}/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.data);
        setShowSearchResults(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentProject]);

  const handleNotifClick = (notif) => {
    markAsRead(notif._id);
    setShowNotifs(false);
    if (notif.link) navigate(notif.link);
  };

  const handleSelectTask = (taskId) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/tasks/${taskId}`);
  };

  const handleSelectIssue = (issueId) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/projects/${currentProject._id}/issues/${issueId}`);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-hamburger" onClick={toggleSidebar} aria-label="Toggle menu">
          ☰
        </button>
        <div className="header-search" ref={searchRef} style={{ position: 'relative' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={currentProject ? `Search in ${currentProject.name}...` : 'Search tasks, issues...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.length >= 2) setShowSearchResults(true); }}
            aria-label="Search"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div
              className="dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: 380,
                maxHeight: 380,
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 'var(--radius-md)',
                zIndex: 100,
              }}
            >
              {!currentProject ? (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
                  Please select a project to search tasks and issues.
                </div>
              ) : isSearching ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div className="spinner spinner-sm"></div>
                </div>
              ) : (
                <div>
                  {/* Tasks */}
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Tasks ({searchResults?.tasks?.length || 0})
                  </div>
                  {(searchResults?.tasks || []).map((t) => (
                    <button
                      key={t._id}
                      className="dropdown-item"
                      onClick={() => handleSelectTask(t._id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 14px' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.assignee?.name || 'Unassigned'}</div>
                      </div>
                      <span className="badge badge-primary">{t.status}</span>
                    </button>
                  ))}

                  {/* Issues */}
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Issues ({searchResults?.issues?.length || 0})
                  </div>
                  {(searchResults?.issues || []).map((iss) => (
                    <button
                      key={iss._id}
                      className="dropdown-item"
                      onClick={() => handleSelectIssue(iss._id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 14px' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>🐛 {iss.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Severity: {iss.severity}</div>
                      </div>
                      <span className="badge badge-amber">{iss.status}</span>
                    </button>
                  ))}

                  {searchResults?.tasks?.length === 0 && searchResults?.issues?.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      No matching tasks or issues found for "{searchQuery}".
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="header-right">
        <div className="dropdown" ref={dropdownRef}>
          <button className="notification-bell" onClick={() => setShowNotifs(!showNotifs)} aria-label="Notifications">
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifs && (
            <div className="dropdown-menu" style={{ width: 360, maxHeight: 400, overflowY: 'auto', right: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 'var(--text-sm)' }}>Notifications</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notifications')} style={{ fontSize: 'var(--text-xs)' }}>View All</button>
              </div>
              {items.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  No notifications
                </div>
              ) : (
                items.slice(0, 8).map((notif) => (
                  <button
                    key={notif._id}
                    className="dropdown-item"
                    onClick={() => handleNotifClick(notif)}
                    style={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 2,
                      opacity: notif.read ? 0.6 : 1,
                      borderLeft: notif.read ? 'none' : '3px solid var(--primary)',
                      paddingLeft: notif.read ? 12 : 9,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{notif.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notif.message}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
