import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [hasSubscription, setHasSubscription] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [initialValidation, setInitialValidation] = useState(false); // Add initial validation flag

  const login = useCallback((token) => {
    localStorage.setItem('authToken', token);
    setToken(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setIsAuthenticated(false);
    setHasSubscription(false);
    setUser(null);
    setInitialValidation(false); // Reset initial validation on logout
    navigate('/signin');
  }, [navigate]);

  const validateUser = useCallback(async () => {
    if (!token) {
      logout();
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.valid) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        setHasSubscription(response.data.hasSubscription);

        // Only redirect after the first validation
        if (!initialValidation) {
          if (response.data.hasSubscription) {
            navigate('/welcome');
          } else {
            navigate('/services');
          }
          setInitialValidation(true); // Mark as validated to prevent further redirects
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error validating user:', error);
      logout();
    }
  }, [token, logout, navigate, initialValidation]);

  useEffect(() => {
    if (token && !initialValidation) {
      validateUser();
    }
  }, [token, validateUser, initialValidation]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, token, hasSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
