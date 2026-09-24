import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
