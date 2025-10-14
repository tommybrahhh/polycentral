import React from 'react';
import { Navigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';

const AdminRoute = ({ children }) => {
  const { data: userProfile, loading, error } = useFetch('/api/user/profile');

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  // Check if user is admin
  if (!userProfile || !userProfile.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;