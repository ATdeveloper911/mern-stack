import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import './Admin.css';

const AdminLayout = () => {
  return (
    <div className="ad-root">
      <AdminSidebar />
      <AdminHeader />
      <div className="ad-main">
        <div className="ad-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
