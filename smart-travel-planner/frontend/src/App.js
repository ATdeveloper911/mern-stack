import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TravelHub from './pages/TravelHub';
import PlacesToStay from './pages/PlacesToStay';
import MoneyMap from './pages/MoneyMap';
import TravelFund from './pages/TravelFund';
import TravelMap from './pages/TravelMap';
import BuddyBot from './pages/BuddyBot';
import Weather from './pages/Weather';
import AdminLayout from './pages/admin_dashboard/AdminLayout';
import DashboardHome from './pages/admin_dashboard/DashboardHome';
import AdminUsers from './pages/admin_dashboard/AdminUsers';
import AdminAccommodations from './pages/admin_dashboard/AdminAccommodations';
import AdminContent from './pages/admin_dashboard/AdminContent';
import AdminReports from './pages/admin_dashboard/AdminReports';
import AdminSettings from './pages/admin_dashboard/AdminSettings';
import AdminProfile from './pages/admin_dashboard/AdminProfile';
import BucketList from './pages/BucketList';
import TravelHistory from './pages/TravelHistory';
import LandingPage from './pages/LandingPage';
import './App.css';

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:resetToken" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/travel-hub"
          element={
            <PrivateRoute>
              <TravelHub />
            </PrivateRoute>
          }
        />
        <Route
          path="/places-to-stay"
          element={
            <PrivateRoute>
              <PlacesToStay />
            </PrivateRoute>
          }
        />
        <Route
          path="/money-map"
          element={
            <PrivateRoute>
              <MoneyMap />
            </PrivateRoute>
          }
        />
        <Route
          path="/travel-fund"
          element={
            <PrivateRoute>
              <TravelFund />
            </PrivateRoute>
          }
        />
        <Route
          path="/bucket-list"
          element={
            <PrivateRoute>
              <BucketList />
            </PrivateRoute>
          }
        />
        <Route
          path="/travel-history"
          element={
            <PrivateRoute>
              <TravelHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/travel-map"
          element={
            <PrivateRoute>
              <TravelMap />
            </PrivateRoute>
          }
        />
        <Route
          path="/buddy-bot"
          element={
            <PrivateRoute>
              <BuddyBot />
            </PrivateRoute>
          }
        />
        <Route
          path="/weather"
          element={
            <PrivateRoute>
              <Weather />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="accommodations" element={<AdminAccommodations />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
