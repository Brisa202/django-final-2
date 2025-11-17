import { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function SecurityAlertsCard() {
  const { user, setUser } = useContext(AuthContext);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && user.unacknowledged_failed_attempts > 0) fetchAttempts();
  }, [user]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/failed-attempts/");
      setAttempts(data.attempts);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAll = async () => {
    await axios.post("/api/failed-attempts/");
    setAttempts([]);
    setUser((prev) => ({ ...prev, unacknowledged_failed_attempts: 0 }));
    setOpen(false);
  };

  if (!user || user.unacknowledged_failed_attempts === 0) return null;

  return (
    <div className="relative">
      {/* 🔔 Icono de alerta */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-red-600 font-bold"
      >
        🔔
        <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
          {user.unacknowledged_failed_attempts}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg p-3 z-50">
          <h3 className="font-semibold text-gray-800 mb-2">Intentos fallidos recientes</h3>

          {loading ? (
            <p>Cargando...</p>
          ) : attempts.length === 0 ? (
            <p>No hay intentos pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {attempts.map((a) => (
                <li key={a.id} className="text-sm text-gray-700 border-b pb-1">
                  <b>{a.username_attempted}</b> — {a.time_ago}<br />
                  IP: {a.ip_address}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={acknowledgeAll}
            className="mt-3 w-full bg-blue-600 text-white rounded-md py-1 text-sm hover:bg-blue-700"
          >
            Marcar como revisados
          </button>
        </div>
      )}
    </div>
  );
}