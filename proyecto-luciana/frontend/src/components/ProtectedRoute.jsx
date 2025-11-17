import { Navigate, useLocation } from 'react-router-dom'; // solo una importación
import { useAuth } from '../context/AuthContext';

const getToken = () =>
  localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

export default function ProtectedRoute({ children }) {
  const { loading, profile } = useAuth();
  const location = useLocation();
  const token = getToken();

  // Sin token → a login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Con token, pero aún cargando perfil → no renders (o poné un loader)
  if (loading) {
    return null; // o <div className="loader" />
  }

  // Token pero perfil no resolvió (401 previo, etc.) → a login
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Ok, puede ver la ruta
  return children;
}
