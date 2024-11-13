// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  const storedToken = localStorage.getItem('authToken');

  if (!isAuthenticated && !storedToken) {
    // Redirect if there's no token or the user is not authenticated
    return <Navigate to="/signin" replace />;
  }

  return element;
};

export default ProtectedRoute;
