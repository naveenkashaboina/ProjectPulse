import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useOrgStore from '../stores/orgStore';
import '../styles/auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isLoading, error } = useAuthStore();
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    const result = await login(form);
    if (result.success) {
      const orgs = result.data.organizations;
      if (orgs?.length > 0) {
        setCurrentOrg(orgs[0]);
        navigate(`/orgs/${orgs[0]._id}/dashboard`);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in">
        <div className="auth-brand">
          <div className="sidebar-brand-icon" style={{ width: 48, height: 48, fontSize: 24 }}>P</div>
          <h1>ProjectPulse</h1>
          <p>Agile Project & Team Collaboration Suite</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate autoComplete="off">
          <h2>Welcome back</h2>
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="Enter your email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="off"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? <span className="spinner spinner-sm"></span> : 'Sign In'}
          </button>

          <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
              Quick Demo Login:
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setForm({ email: 'sarah.chen@acmecorp.com', password: 'Password123!' })}
              >
                Sarah Chen (Admin)
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setForm({ email: 'david.kim@acmecorp.com', password: 'Password123!' })}
              >
                David Kim (Dev)
              </button>
            </div>
          </div>

          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
