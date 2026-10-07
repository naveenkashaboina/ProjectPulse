import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useOrgStore from '../stores/orgStore';
import '../styles/auth.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isLoading, error } = useAuthStore();
  const signup = useAuthStore((state) => state.signup);
  const clearError = useAuthStore((state) => state.clearError);
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);
  const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else {
      if (!/[A-Z]/.test(form.password)) errs.password = 'Password needs an uppercase letter';
      else if (!/[a-z]/.test(form.password)) errs.password = 'Password needs a lowercase letter';
      else if (!/[0-9]/.test(form.password)) errs.password = 'Password needs a number';
    }
    if (form.organizationName?.trim() && form.organizationName.trim().length < 2) {
      errs.organizationName = 'Organization name must be at least 2 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.organizationName?.trim() ? { organizationName: form.organizationName.trim() } : {}),
    };

    const result = await signup(payload);
    if (result.success) {
      const org = result.data.organization;
      if (org) {
        setCurrentOrg({ ...org, role: 'OrgAdmin' });
        navigate(`/orgs/${org._id}/dashboard`);
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in">
        <div className="auth-brand">
          <div className="sidebar-brand-icon" style={{ width: 48, height: 48, fontSize: 24 }}>P</div>
          <h1>ProjectPulse</h1>
          <p>Create your workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" noValidate autoComplete="off">
          <h2>Get started</h2>
          {error && (
            <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => {
                if (error) clearError();
                setForm({ ...form, name: e.target.value });
              }}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`input ${errors.email || (error && error.toLowerCase().includes('email')) ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => {
                if (error) clearError();
                setForm({ ...form, email: e.target.value });
              }}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`input ${errors.password || (error && error.toLowerCase().includes('password')) ? 'input-error' : ''}`}
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                value={form.password}
                onChange={(e) => {
                  if (error) clearError();
                  setForm({ ...form, password: e.target.value });
                }}
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
          <div className="input-group">
            <label htmlFor="orgName">Organization Name <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input
              id="orgName"
              type="text"
              className="input"
              placeholder="My Company"
              value={form.organizationName}
              onChange={(e) => {
                if (error) clearError();
                setForm({ ...form, organizationName: e.target.value });
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? <span className="spinner spinner-sm"></span> : 'Create Account'}
          </button>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
