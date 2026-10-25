import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isJwtExpired } from '../api/client';
import PairUpLoader from './PairUpLoader';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading, logout } = useAuth();
  const location = useLocation();

  const isExpired = Boolean(token && isJwtExpired(token));

  useEffect(() => {
    if (isExpired) {
      logout({ skipServer: true });
    }
  }, [isExpired, logout]);

  if (loading) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PairUpLoader text="VERIFYING SESSION" size={440} />
      </div>
    );
  }

  if (!token || !user || isExpired) {
    const notice = isExpired ? '?notice=Your%20session%20has%20expired.%20Please%20sign%20in%20again.' : '';
    return <Navigate to={`/login${notice}`} state={{ from: location }} replace />;
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
