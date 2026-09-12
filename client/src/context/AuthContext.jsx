import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_direct_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('chat_direct_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Failed to create account' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('chat_direct_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Failed to sign in' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (username) => {
    if (!username || username.trim().length < 2) return null;
    try {
      const res = await fetch(apiUrl(`/api/auth/check-username/${encodeURIComponent(username.trim())}`));
      const data = await res.json();
      return data.available;
    } catch {
      return null;
    }
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl(`/api/profile/${currentUser.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('chat_direct_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  const deleteAccount = async (password) => {
    if (!currentUser) return { success: false, error: 'No signed-in account' };
    try {
      const res = await fetch(apiUrl(`/api/account/${currentUser.id}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.removeItem('chat_direct_user');
        setCurrentUser(null);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete account' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('chat_direct_user');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, register, login, logout, deleteAccount, updateProfile, checkUsername, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
