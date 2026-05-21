import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('student_token');
    if (token) {
      api.get('/auth/me')
        .then(r => { setUser(r.data.user); localStorage.setItem('student_user', JSON.stringify(r.data.user)); })
        .catch(() => { 
          localStorage.removeItem('student_token'); 
          localStorage.removeItem('student_user'); 
          setUser(null); 
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('student_token', token);
    localStorage.setItem('student_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
