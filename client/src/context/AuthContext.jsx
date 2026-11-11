import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.js';
import { refreshSession, setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  // On app start: try to restore the session using the httpOnly refresh cookie
  useEffect(() => {
    let active = true;

    refreshSession()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('guest');
      });

    // Fired by the API client when refresh fails (session really expired)
    const onForcedLogout = () => {
      setUser(null);
      setStatus('guest');
    };
    window.addEventListener('auth:logout', onForcedLogout);

    return () => {
      active = false;
      window.removeEventListener('auth:logout', onForcedLogout);
    };
  }, []);

  const value = useMemo(() => {
    const startSession = (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStatus('authenticated');
      return data.user;
    };

    return {
      user,
      status,
      isAdmin: user?.role === 'admin',
      login: async (credentials) => startSession(await authApi.login(credentials)),
      register: async (input) => startSession(await authApi.register(input)),
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setAccessToken(null);
          setUser(null);
          setStatus('guest');
          queryClient.clear(); // drop cached private data (bookings etc.)
        }
      },
    };
  }, [user, status, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
