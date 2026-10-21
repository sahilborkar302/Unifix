import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../services/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.me().then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const r = await api.login(identifier, password);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);
  const register = useCallback(async (data) => {
    const r = await api.register(data);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const homePathFor = (role) => (role === 'admin' ? '/admin' : role === 'technician' ? '/workboard' : '/dashboard');
