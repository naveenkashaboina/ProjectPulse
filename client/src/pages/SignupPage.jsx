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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    const result = await signup(form);
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
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <h2>Get started</h2>
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" className={`input ${errors.name ? 'input-error' : ''}`} placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className={`input ${errors.password ? 'input-error' : ''}`} placeholder="Min 8 chars, 1 upper, 1 lower, 1 number" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="orgName">Organization Name <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input id="orgName" type="text" className="input" placeholder="My Company" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
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
