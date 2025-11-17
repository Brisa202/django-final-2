import { useAuth } from '../context/AuthContext';
import { UserRound, Bell } from 'lucide-react';
import axios from '../api/axios';
import { useState, useEffect } from 'react';

export default function TopBar() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/failed-login-attempts/');
        setAlerts(res.data.count || 0);
      } catch (err) {
        console.error('Error al obtener alertas:', err);
      }
    };
    fetchAlerts();
  }, []);

  const acknowledgeAlerts = async () => {
    try {
      const res = await axios.post('/api/failed-login-attempts/');
      if (res.data.success) {
        setAlerts(0);
        setOpen(false);
      }
    } catch (err) {
      console.error('Error al marcar alertas:', err);
    }
  };

  return (
    <header className="topbar">
      <div className="tb-title">
        <h1>Hollywood Producciones</h1>
        <p>Sistema administrativo de alquiler de vajillas.</p>
      </div>

      <div className="tb-user">
        <div className="tb-alert">
          <button className="bell-btn" onClick={() => setOpen(!open)}>
            <Bell size={18} />
            {alerts > 0 && <span className="badge">{alerts}</span>}
          </button>

          {open && (
            <div className="alert-dropdown">
              {alerts > 0 ? (
                <>
                  <p>Tienes {alerts} intento(s) de inicio de sesión fallido(s).</p>
                  <button onClick={acknowledgeAlerts}>Marcar como leído</button>
                </>
              ) : (
                <p>No hay alertas nuevas.</p>
              )}
            </div>
          )}
        </div>

        <div className="tb-avatar"><UserRound size={18} /></div>
        <div className="tb-meta">
          <b>{profile?.is_superuser ? 'Administrador' : (profile?.username || '')}</b>
          <small>{profile?.email}</small>
        </div>
      </div>
    </header>
  );
}
