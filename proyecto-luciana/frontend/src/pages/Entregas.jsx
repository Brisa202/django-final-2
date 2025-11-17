// src/pages/Entregas.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import {
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  TrendingUp,
  Search,
  Filter as FilterIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ESTADOS = [
  { value: "todos",        label: "Todos",        color: "#64748b" },
  { value: "pendiente",    label: "Pendiente",    color: "#f59e0b" },
  { value: "en_camino",    label: "En camino",    color: "#3b82f6" },
  { value: "entregado",    label: "Entregado",    color: "#10b981" },
  { value: "no_entregado", label: "No entregado", color: "#ef4444" },
  { value: "cancelado",    label: "Cancelado",    color: "#6b7280" },
];

const getEstadoConfig = (estado) => {
  switch (estado) {
    case "pendiente":
      return { color: "#f59e0b", bg: "#fef3c7", icon: Clock,       label: "Pendiente" };
    case "en_camino":
      return { color: "#3b82f6", bg: "#dbeafe", icon: Truck,       label: "En camino" };
    case "entregado":
      return { color: "#10b981", bg: "#d1fae5", icon: CheckCircle2, label: "Entregado" };
    case "no_entregado":
      return { color: "#ef4444", bg: "#fee2e2", icon: XCircle,    label: "No entregado" };
    case "cancelado":
      return { color: "#6b7280", bg: "#f3f4f6", icon: XCircle,    label: "Cancelado" };
    default:
      return { color: "#64748b", bg: "#f1f5f9", icon: Clock,      label: estado };
  }
};

/* =========================================================
   TARJETA DE ENTREGA (PRIVACIDAD: no muestra dirección / nombre)
   ========================================================= */
function EntregaCard({ entrega, onView, onDelete, onMap, isAdmin }) {
  const estadoConfig = getEstadoConfig(entrega.estado_entrega);
  const IconoEstado = estadoConfig.icon;

  const fecha = new Date(entrega.fecha_hora_entrega);
  const hora = fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dia = fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });

  const entregaId = entrega.id ?? entrega.id_entrega;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        border: `2px solid ${estadoConfig.color}`,
        boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.08)";
      }}
    >
      {/* Barra lateral */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: estadoConfig.color,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              background: estadoConfig.bg,
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={24} color={estadoConfig.color} />
          </div>
          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              {hora}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                textTransform: "capitalize",
              }}
            >
              {dia}
            </div>
          </div>
        </div>

        <div
          style={{
            background: estadoConfig.bg,
            color: estadoConfig.color,
            padding: "8px 16px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconoEstado size={14} />
          {estadoConfig.label}
        </div>
      </div>

      {/* Info principal (sin datos sensibles) */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#1e293b",
            marginBottom: 4,
          }}
        >
          Entrega #{entregaId}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Detalles completos (dirección y responsable) solo al abrir la entrega.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 16,
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          Alquiler #{entrega.alquiler?.id || entrega.alquiler_id}
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onView(entregaId)}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Eye size={14} />
            Ver
          </button>

          <button
            onClick={() => onMap(entrega)}
            disabled={!entrega.direccion}
            style={{
              background: entrega.direccion ? "#10b981" : "#e2e8f0",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: entrega.direccion ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 500,
              opacity: entrega.direccion ? 1 : 0.5,
            }}
          >
            🗺️
          </button>

          {isAdmin && (
            <button
              onClick={() => onDelete(entregaId)}
              style={{
                background: "#fee2e2",
                color: "#ef4444",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   VISTA AGENDA
   ========================================================= */
function AgendaView({ entregas, onView, onDelete, onMap, isAdmin }) {
  const entregasPorFecha = useMemo(() => {
    const grupos = {};
    entregas.forEach((e) => {
      if (!e.fecha_hora_entrega) return;
      const fecha = new Date(e.fecha_hora_entrega).toLocaleDateString("es-AR");
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(e);
    });
    return grupos;
  }, [entregas]);

  const fechasOrdenadas = Object.keys(entregasPorFecha).sort(
    (a, b) =>
      new Date(a.split("/").reverse().join("-")) -
      new Date(b.split("/").reverse().join("-"))
  );

  return (
    <div style={{ padding: 24 }}>
      {fechasOrdenadas.map((fecha) => (
        <div key={fecha} style={{ marginBottom: 32 }}>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Calendar size={20} />
            {fecha}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 20,
            }}
          >
            {entregasPorFecha[fecha]
              .sort(
                (a, b) =>
                  new Date(a.fecha_hora_entrega) -
                  new Date(b.fecha_hora_entrega)
              )
              .map((entrega) => (
                <EntregaCard
                  key={entrega.id}
                  entrega={entrega}
                  onView={onView}
                  onDelete={onDelete}
                  onMap={onMap}
                  isAdmin={isAdmin}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL (ESTILO EMPLOYEES)
   ========================================================= */
export default function Entregas() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [items, setItems] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [filtroRecientes, setFiltroRecientes] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  const [mapEntrega, setMapEntrega] = useState(null);

  // Estadísticas por estado (para mostrar contadores en las pastillas)
  const stats = useMemo(() => {
    const base = {
      total: items.length,
      pendiente: 0,
      en_camino: 0,
      entregado: 0,
      no_entregado: 0,
      cancelado: 0,
    };

    items.forEach((e) => {
      if (e.estado_entrega && base.hasOwnProperty(e.estado_entrega)) {
        base[e.estado_entrega] += 1;
      }
    });

    return base;
  }, [items]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErr("");
      const params = {};
      if (estadoFiltro !== "todos") params.estado = estadoFiltro;
      const { data } = await axios.get("/api/entregas/", { params });
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error(error);
      setErr("No se pudo cargar el listado de entregas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro]);

  // Mostrar lista cuando hay filtros/búsqueda o "Más recientes"
  useEffect(() => {
    if (search.trim() || estadoFiltro !== "todos" || filtroRecientes) {
      setMostrarLista(true);
    }
  }, [search, estadoFiltro, filtroRecientes]);

  // Más recientes (top 20)
  const recientes = useMemo(() => {
    if (!filtroRecientes) return items;
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.fecha_hora_entrega || b.id) -
          new Date(a.fecha_hora_entrega || a.id)
      )
      .slice(0, 20);
  }, [items, filtroRecientes]);

  // Filtro por búsqueda + estado
  const filtrados = useMemo(() => {
    const base = filtroRecientes ? recientes : items;
    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((e) => {
      const dir = (e.direccion || "").toLowerCase();
      const idtxt = `#${e.id}`.toLowerCase();
      const alq = e.alquiler
        ? `#${e.alquiler.id} ${e.alquiler.cliente || ""}`.toLowerCase()
        : "";
      return dir.includes(q) || idtxt.includes(q) || alq.includes(q);
    });
  }, [items, recientes, filtroRecientes, search]);

  const handleView = (id) => {
    navigate(`/entregas/${id}/editar`);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("¿Borrar esta entrega?")) return;

    try {
      await axios.delete(`/api/entregas/${id}/`);
      setItems((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error(error);
      alert("No se pudo borrar la entrega.");
    }
  };

  const openMap = (entrega) => {
    if (!entrega || !entrega.direccion) return;
    setMapEntrega(entrega);
  };

  const closeMap = () => setMapEntrega(null);

  // Si querés que solo admin vea Entregas, descomentá esto:
  /*
  if (!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">
            Solo los administradores pueden ver y gestionar entregas.
          </p>
        </div>
      </Layout>
    );
  }
  */

  return (
    <Layout>
      <div className="card">
        {/* HEADER AL ESTILO EMPLOYEES */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 6px 0",
                fontSize: 20,
                fontWeight: 700,
                color: "#111",
              }}
            >
              Entregas
            </h3>
            <p className="muted">Gestión eficiente y privada de entregas</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {/* Buscador estilo Employees */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#fffdf2",
                borderRadius: 12,
                padding: "8px 14px",
                border: "1px solid #e2d18a",
                minWidth: 260,
              }}
            >
              <Search size={16} style={{ color: "#B0B0B0" }} />
              <input
                placeholder="Buscar por dirección, #entrega o #alquiler…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 14,
                  paddingLeft: 8,
                  width: "100%",
                }}
              />
            </div>

            {/* Botón nueva entrega, igual estilo al de empleados */}
            {isAdmin && (
              <button
                onClick={() => navigate("/entregas/nueva")}
                className="btn"
                style={{
                  background: "#ffd700",
                  color: "#111",
                  border: "1px solid #d6b73f",
                  padding: "8px 16px",
                  borderRadius: 12,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={16} /> Nueva entrega
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE FILTROS (COPIADA DE EMPLOYEES) */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            padding: "16px 20px",
            background: "linear-gradient(135deg, #FFFBF0 0%, #FFF5E1 100%)",
            borderRadius: 8,
            flexWrap: "wrap",
            alignItems: "center",
            border: "1px solid #FFE4A3",
          }}
        >
          {/* Más recientes */}
          <button
            onClick={() => {
              const next = !filtroRecientes;
              setFiltroRecientes(next);
              if (next) {
                // si activás "Más recientes", volvés a 'todos'
                setEstadoFiltro("todos");
              }
            }}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border: filtroRecientes
                ? "2px solid #DEB887"
                : "1px solid #FFE4A3",
              background: filtroRecientes
                ? "linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)"
                : "#FFF9E6",
              color: filtroRecientes ? "#8B4513" : "#C77C2A",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: filtroRecientes
                ? "0 4px 12px rgba(222,184,135,0.25)"
                : "none",
            }}
          >
            <TrendingUp size={16} />
            Más recientes
          </button>

          <div
            style={{ width: 1, background: "#FFE4A3", margin: "0 4px" }}
          />

          {/* Botones por estado, estilo pastillas como Employees */}
          {ESTADOS.map((estado) => {
            const active = estadoFiltro === estado.value;
            let count = "";

            if (estado.value === "todos") {
              count = stats.total;
            } else if (stats.hasOwnProperty(estado.value)) {
              count = stats[estado.value];
            }

            return (
              <button
                key={estado.value}
                onClick={() => {
                  setEstadoFiltro(estado.value);
                  setFiltroRecientes(false);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 24,
                  border: active
                    ? "2px solid #DEB887"
                    : "1px solid #FFE4A3",
                  background: active
                    ? "linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)"
                    : "#FFFFFF",
                  color: active ? "#8B4513" : "#A0522D",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  boxShadow: active
                    ? "0 4px 12px rgba(222,184,135,0.25)"
                    : "none",
                }}
              >
                {estado.label}
                {count !== "" && (
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.8,
                    }}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}

          {/* Refrescar */}
          <button
            onClick={fetchData}
            style={{
              padding: "10px",
              borderRadius: 12,
              border: "1px solid #FFE4A3",
              background: "#FFFFFF",
              color: "#A0522D",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              marginLeft: "auto",
            }}
          >
            <RefreshCw size={18} />
          </button>

          {(estadoFiltro !== "todos" ||
            filtroRecientes ||
            search.trim()) && (
            <button
              onClick={() => {
                setEstadoFiltro("todos");
                setFiltroRecientes(false);
                setSearch("");
                setMostrarLista(false);
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 24,
                border: "2px solid #fecaca",
                background: "#fff",
                color: "#ef4444",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                marginLeft: 8,
                transition: "all 0.25s ease",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* CONTENIDO (copiando estructura de Employees) */}
        <div>
          {loading && (
            <p
              className="muted"
              style={{ textAlign: "center", padding: 40 }}
            >
              Cargando entregas…
            </p>
          )}

          {!loading && err && (
            <p
              className="muted"
              style={{
                textAlign: "center",
                padding: 40,
                color: "#E53935",
              }}
            >
              {err}
            </p>
          )}

          {/* Mensaje sin filtros (igual idea que Employees) */}
          {!loading && !err && !mostrarLista && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#fafafa",
                borderRadius: 12,
                border: "2px dashed #e8a34d",
              }}
            >
              <FilterIcon
                size={48}
                color="#e8a34d"
                style={{ marginBottom: 16 }}
              />
              <h3
                style={{
                  color: "#c77c2a",
                  marginBottom: 8,
                  fontSize: 20,
                }}
              >
                Usa los filtros o el buscador para ver entregas
              </h3>
              <p
                style={{
                  color: "#757575",
                  fontSize: 14,
                  marginBottom: 20,
                }}
              >
                Selecciona &quot;Más recientes&quot; o filtrá por estado
                para comenzar.
              </p>
              <button
                onClick={() => setFiltroRecientes(true)}
                style={{
                  background: "#fff9e6",
                  color: "#c77c2a",
                  border: "2px solid #e8a34d",
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TrendingUp size={18} />
                Ver entregas más recientes
              </button>
            </div>
          )}

          {!loading && mostrarLista && filtrados.length === 0 && (
            <p
              className="muted"
              style={{ textAlign: "center", padding: 40 }}
            >
              No se encontraron entregas con los filtros aplicados.
            </p>
          )}

          {!loading && mostrarLista && filtrados.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <AgendaView
                entregas={filtrados}
                onView={handleView}
                onDelete={handleDelete}
                onMap={openMap}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL MAPA */}
      {mapEntrega && (
        <>
          <div
            onClick={closeMap}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 50,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
              maxWidth: 800,
              width: "90%",
              maxHeight: "90vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              zIndex: 51,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1e293b",
                  margin: 0,
                }}
              >
                📍 Ubicación entrega #{mapEntrega.id}
              </h3>
              <button
                onClick={closeMap}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 32,
                  color: "#64748b",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{
                color: "#64748b",
                marginBottom: 16,
                fontSize: 16,
              }}
            >
              {mapEntrega.direccion}
            </p>

            <div style={{ borderRadius: 12, overflow: "hidden", flex: 1 }}>
              <iframe
                title="Mapa entrega"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  mapEntrega.direccion
                )}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: "none" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}



