import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Toast from '../common/Toast';

export default function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </div>
      <Toast />
    </div>
  );
}
