import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const AuthContext = createContext();

const getToken = () =>
  localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const isPublic = (pathname) => pathname === '/login' || pathname === '/';

  const refreshProfile = async () => {
    try {
      const { data } = await axios.get('/api/perfil/');
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // logout reusable (no recarga la página)
  const logout = () => {
    ['access_token', 'refresh_token'].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setProfile(null);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const pub = isPublic(location.pathname);
    const token = getToken();

    if (pub) {
      setLoading(false);
      return;
    }
    if (!token) {
      // ruta privada pero sin token => no pedir perfil, forzar login
      setProfile(null);
      setLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Boolean ya calculado para usar directo en UI
  const isAdmin = useMemo(() => {
    if (!profile) return false;
    if (profile.is_superuser) return true;

    const groups = (profile.groups || []).map((g) => String(g).toLowerCase());
    const rolEfectivo = (profile.rol_efectivo || '').toLowerCase();

    return groups.includes('admin') || rolEfectivo === 'administrador';
  }, [profile]);

  const value = {
    profile,
    isAdmin,           // boolean
    loading,
    refreshProfile,
    logout,            // úsalo en el Sidebar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);