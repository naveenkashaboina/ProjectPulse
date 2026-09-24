import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="animate-slide-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on task assignments, comments, and mentions</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {notifications.map((n) => (
            <div
              key={n._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-md)',
                background: n.read ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
                borderLeft: n.read ? '1px solid var(--border-subtle)' : '4px solid var(--primary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {n.title}
                </h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                  {n.message}
                </p>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                {n.link && (
                  <Link to={n.link} className="btn btn-primary btn-sm">
                    View
                  </Link>
                )}
                {!n.read && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMarkAsRead(n._id)}>
                    ✓ Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>
              No notifications yet!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
