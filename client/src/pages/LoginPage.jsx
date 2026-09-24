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
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <h2>Welcome back</h2>
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? <span className="spinner spinner-sm"></span> : 'Sign In'}
          </button>
          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
