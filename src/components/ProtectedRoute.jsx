import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PairUpLoader from './PairUpLoader';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PairUpLoader text="VERIFYING SESSION" size={440} />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p className="sub">You do not have permission to access this portal.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Return to Home</a>
      </div>
    );
  }

  return children;
}
