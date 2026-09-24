import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useOrgStore from '../stores/orgStore';
import useUiStore from '../stores/uiStore';
import api from '../utils/api';
import '../styles/auth.css';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);
  const addToast = useUiStore((state) => state.addToast);

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invitations/${token}`);
        setInvitation(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Invalid or expired invitation token');
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      const res = await api.post(`/invitations/${token}/accept`);
      await fetchMe();
      const org = res.data.data.organization;
      if (org) {
        setCurrentOrg({ ...org, role: res.data.data.role });
        addToast({ type: 'success', message: `Welcome to ${org.name}!` });
        navigate(`/orgs/${org._id}/dashboard`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in" style={{ maxWidth: 480 }}>
        <div className="auth-brand">
          <div className="sidebar-brand-icon" style={{ width: 48, height: 48, fontSize: 24 }}>P</div>
          <h1>ProjectPulse</h1>
          <p>Organization Invitation</p>
        </div>

        {error ? (
          <div className="auth-form" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 'var(--space-md)' }}>⚠️</div>
            <h2>Unable to Join</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>{error}</p>
            <Link to={isAuthenticated ? '/' : '/login'} className="btn btn-primary" style={{ width: '100%' }}>
              {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
            </Link>
          </div>
        ) : (
          <div className="auth-form" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 'var(--space-sm)' }}>✉️</div>
            <h2>You've been invited!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              You are invited to join <strong>{invitation?.organization?.name}</strong> as a{' '}
              <span className="badge badge-primary">{invitation?.role}</span>
            </p>

            {invitation?.organization?.description && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontStyle: 'italic' }}>
                "{invitation.organization.description}"
              </p>
            )}

            {isAuthenticated ? (
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                  Logged in as <strong>{user?.name}</strong> ({user?.email})
                </p>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleAccept}
                  disabled={accepting}
                  style={{ width: '100%' }}
                >
                  {accepting ? <span className="spinner spinner-sm"></span> : 'Accept & Join Organization'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                  Please sign in or create an account to accept this invitation.
                </p>
                <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                  Sign In to Accept
                </Link>
                <Link to="/signup" className="btn btn-outline" style={{ width: '100%' }}>
                  Create New Account
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
