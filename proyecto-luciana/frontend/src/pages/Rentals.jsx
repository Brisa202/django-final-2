// src/pages/Rentals.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Package,
  DollarSign,
  TrendingUp,
  Shield,
  AlertCircle,
  X,
  Calendar,
  User,
  Filter,
} from "lucide-react";

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ESTADO_COLORS = {
  pendiente: {
    bg: "#FFF8E1",
    text: "#F57F17",
    label: "Pendiente",
    gradient: "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)",
  },
  confirmado: {
    bg: "#E1F5FE",
    text: "#0277BD",
    label: "Confirmado",
    gradient: "linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%)",
  },
  activo: {
    bg: "#E8F5E9",
    text: "#2E7D32",
    label: "Activo",
    gradient: "linear-gradient(135deg, #81C784 0%, #66BB6A 100%)",
  },
  finalizado: {
    bg: "#F5F5F5",
    text: "#616161",
    label: "Finalizado",
    gradient: "linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)",
  },
  cancelado: {
    bg: "#FFEBEE",
    text: "#C62828",
    label: "Cancelado",
    gradient: "linear-gradient(135deg, #EF5350 0%, #E53935 100%)",
  },
  entregado: {
    bg: "#E8EAF6",
    text: "#3949AB",
    label: "Entregado",
    gradient: "linear-gradient(135deg, #9FA8DA 0%, #7986CB 100%)",
  },
};

const GARANTIA_COLORS = {
  pendiente: { color: "#F9A825", label: "PENDIENTE" },
  devuelta: { color: "#43A047", label: "DEVUELTA" },
  aplicada: { color: "#E53935", label: "APLICADA" },
};

const ITEMS_PER_PAGE = 5;

// Nombre corto para la TARJETA (por seguridad)
const shortClientName = (name) => {
  if (!name) return "—";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
};

export default function Rentals() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // filtros tipo Products
  const [filterEstado, setFilterEstado] = useState("todos");
  const [sortRecent, setSortRecent] = useState(false);

  const location = useLocation();

  const pushToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchList = async () => {
    try {
      const { data } = await axios.get("/api/alquileres/");
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch {
      pushToast("error", "No se pudieron cargar los alquileres.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (location.state?.created) {
      pushToast("success", `Alquiler #${location.state.id} creado.`);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.updated) {
      pushToast("success", `Alquiler #${location.state.id} actualizado.`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filtered = useMemo(() => {
    let result = rows;

    // filtro por estado
    if (filterEstado !== "todos") {
      result = result.filter((r) => r.estado === filterEstado);
    }

    // búsqueda
    const t = q.trim().toLowerCase();
    if (t) {
      result = result.filter((r) =>
        [r.id, r.cliente_nombre, r.creado_en, r.estado]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t))
      );
    }

    // ordenar más recientes
    if (sortRecent) {
      result = [...result].sort((a, b) => {
        const da = new Date(a.creado_en || a.id);
        const db = new Date(b.creado_en || b.id);
        return db - da;
      });
    }

    return result;
  }, [rows, q, filterEstado, sortRecent]);

  // Resetear página cuando cambian filtros/búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [q, filterEstado, sortRecent]);

  // paginación
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filtered.slice(startIndex, endIndex);

  const onDelete = async (id) => {
    if (!window.confirm(`¿Eliminar alquiler #${id}?`)) return;
    try {
      await axios.delete(`/api/alquileres/${id}/`);
      pushToast("success", "Alquiler eliminado.");
      fetchList();
    } catch (e) {
      const code = e?.response?.status;
      if (code === 409)
        pushToast("error", "No puede eliminarse: hay incidentes abiertos.");
      else pushToast("error", "No se pudo eliminar.");
    }
  };

  // 🔧 FIX: Obtener items del alquiler junto con el resumen
  const verResumen = async (row) => {
    setResumen(row);
    setLoadingResumen(true);
    try {
      // Obtener resumen (totales, incidentes, etc.)
      const { data: resumenData } = await axios.get(`/api/alquileres/${row.id}/resumen/`);
      
      // 🆕 Obtener el alquiler completo con los items
      const { data: alquilerData } = await axios.get(`/api/alquileres/${row.id}/`);
      
      // Combinar ambos datos
      setResumen({ 
        ...row, 
        resumenData: {
          ...resumenData,
          items: alquilerData.items || [] // ✅ Agregar los items al resumen
        }
      });
    } catch (e) {
      console.error('Error al cargar resumen:', e);
      pushToast("error", "No se pudo cargar el resumen.");
      setResumen(null);
    } finally {
      setLoadingResumen(false);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Números de página con puntos suspensivos
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }

    return pages;
  };

  // Stats para los chips
  const stats = useMemo(() => {
    const total = rows.length;
    const pendientes = rows.filter((r) => r.estado === "pendiente").length;
    const activos = rows.filter((r) => r.estado === "activo").length;
    const finalizados = rows.filter((r) => r.estado === "finalizado").length;
    const cancelados = rows.filter((r) => r.estado === "cancelado").length;
    return { total, pendientes, activos, finalizados, cancelados };
  }, [rows]);

  const hasFilters = q || filterEstado !== "todos" || sortRecent;
  const showData = filtered.length > 0 && hasFilters;

  const clearFilters = () => {
    setQ("");
    setFilterEstado("todos");
    setSortRecent(false);
  };

  return (
    <Layout>
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#43A047" : "#E53935",
            color: "white",
            padding: "12px 20px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        {/* HEADER estilo Products */}
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
              Alquileres
            </h3>
            <p className="muted">Listado de alquileres creados.</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Buscador dorado */}
            <div
              style={{
                position: "relative",
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
                placeholder="Buscar por cliente, estado o ID…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 14,
                  paddingLeft: 8,
                  width: "100%",
                  color: "#111",
                }}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  title="Limpiar búsqueda"
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#757575",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <Link
              to="/pedidos/nuevo"
              className="btn"
              style={{
                background: "#ffd700",
                color: "#111",
                fontWeight: 600,
                border: "1px solid #d6b73f",
                padding: "8px 16px",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={16} /> Nuevo pedido
            </Link>
          </div>
        </div>

        {/* FILTROS estilo Products */}
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
              setSortRecent(!sortRecent);
              if (!sortRecent) setFilterEstado("todos");
            }}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border: sortRecent ? "2px solid #DEB887" : "1px solid #FFE4A3",
              background: sortRecent
                ? "linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)"
                : "#FFF9E6",
              color: sortRecent ? "#8B4513" : "#C77C2A",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: sortRecent
                ? "0 4px 12px rgba(222,184,135,0.25)"
                : "none",
            }}
          >
            <TrendingUp size={16} />
            Más recientes
          </button>

          <div style={{ width: 1, alignSelf: "stretch", background: "#FFE4A3" }} />

          {/* Todos */}
          <button
            onClick={() => setFilterEstado("todos")}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border:
                filterEstado === "todos"
                  ? "2px solid #DEB887"
                  : "1px solid #FFE4A3",
              background:
                filterEstado === "todos"
                  ? "linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)"
                  : "#FFFFFF",
              color: filterEstado === "todos" ? "#8B4513" : "#A0522D",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            <User size={16} />
            Todos ({stats.total})
          </button>

          {/* Pendientes */}
          <button
            onClick={() => setFilterEstado("pendiente")}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border:
                filterEstado === "pendiente"
                  ? "2px solid #F57F17"
                  : "1px solid #FFE4A3",
              background:
                filterEstado === "pendiente" ? "#FFF3E0" : "#FFFFFF",
              color: filterEstado === "pendiente" ? "#F57F17" : "#666",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            Pendientes ({stats.pendientes})
          </button>

          {/* Activos */}
          <button
            onClick={() => setFilterEstado("activo")}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border:
                filterEstado === "activo"
                  ? "2px solid #4CAF50"
                  : "1px solid #FFE4A3",
              background: filterEstado === "activo" ? "#E8F5E9" : "#FFFFFF",
              color: filterEstado === "activo" ? "#2E7D32" : "#666",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            Activos ({stats.activos})
          </button>

          {/* Finalizados */}
          <button
            onClick={() => setFilterEstado("finalizado")}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border:
                filterEstado === "finalizado"
                  ? "2px solid #9E9E9E"
                  : "1px solid #FFE4A3",
              background:
                filterEstado === "finalizado" ? "#EEEEEE" : "#FFFFFF",
              color: filterEstado === "finalizado" ? "#616161" : "#666",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            Finalizados ({stats.finalizados})
          </button>

          {/* Cancelados */}
          <button
            onClick={() => setFilterEstado("cancelado")}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border:
                filterEstado === "cancelado"
                  ? "2px solid #E53935"
                  : "1px solid #FFE4A3",
              background:
                filterEstado === "cancelado" ? "#FFEBEE" : "#FFFFFF",
              color: filterEstado === "cancelado" ? "#C62828" : "#666",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            Cancelados ({stats.cancelados})
          </button>

          {(filterEstado !== "todos" || sortRecent || q) && (
            <button
              onClick={clearFilters}
              style={{
                padding: "10px 20px",
                borderRadius: 24,
                border: "2px solid #fecaca",
                background: "#fff",
                color: "#ef4444",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                marginLeft: "auto",
                transition: "all 0.25s ease",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* CONTENIDO */}
        <div style={{ padding: "20px 0" }}>
          {loading && (
            <p className="muted" style={{ textAlign: "center", padding: 40 }}>
              Cargando…
            </p>
          )}

          {/* Estado inicial sin filtros (como Products) */}
          {!loading && !hasFilters && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#fafafa",
                borderRadius: 12,
                border: "2px dashed #e8a34d",
              }}
            >
              <Filter size={48} color="#e8a34d" style={{ marginBottom: 16 }} />
              <h3
                style={{
                  color: "#c77c2a",
                  marginBottom: 8,
                  fontSize: 20,
                }}
              >
                Usa los filtros o el buscador para ver alquileres
              </h3>
              <p
                style={{
                  color: "#757575",
                  fontSize: 14,
                  marginBottom: 20,
                }}
              >
                Seleccioná &quot;Más recientes&quot; o filtrá por estado para
                comenzar
              </p>
              <button
                onClick={() => setSortRecent(true)}
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
                Ver alquileres más recientes
              </button>
            </div>
          )}

          {/* Sin resultados con filtros */}
          {!loading && hasFilters && filtered.length === 0 && (
            <p className="muted" style={{ textAlign: "center", padding: 40 }}>
              Sin resultados para &quot;{q}&quot;.
            </p>
          )}

          {/* LISTA DE CARDS */}
          <div style={{ display: "grid", gap: 16 }}>
            {!loading &&
              showData &&
              paginatedData.map((r) => {
                const estadoStyle = ESTADO_COLORS[r.estado] || {};
                const garantiaStyle =
                  GARANTIA_COLORS[r.garantia_estado] || {};

                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E0E0E0",
                      borderRadius: 12,
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(255,213,79,0.3)";
                      e.currentTarget.style.borderColor = "#FFD54F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.08)";
                      e.currentTarget.style.borderColor = "#E0E0E0";
                    }}
                  >
                    {/* HEADER: info mínima segura */}
                    <div
                      style={{
                        background: estadoStyle.gradient || "#E0E0E0",
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          Alquiler #{r.id}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 4,
                            opacity: 0.95,
                          }}
                        >
                          <User size={14} color="#fff" />
                          <span style={{ fontSize: 14, color: "#fff" }}>
                            {shortClientName(r.cliente_nombre)}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {/* 🔧 FIX: Usar monto_total en lugar de total_alquiler */}
                          {fmt(r.monto_total || 0)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.9,
                            marginTop: 2,
                            color: "#fff",
                          }}
                        >
                          Total
                        </div>
                      </div>
                    </div>

                    {/* CONTENIDO TARJETA (resumen, sin datos sensibles) */}
                    <div style={{ padding: 20 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: 16,
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#757575",
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Calendar size={12} />
                            Creado
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#212121",
                            }}
                          >
                            {r.creado_en
                              ? new Date(r.creado_en).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#757575",
                              marginBottom: 4,
                            }}
                          >
                            Estado
                          </div>
                          <span
                            style={{
                              background: estadoStyle.bg,
                              color: estadoStyle.text,
                              padding: "4px 12px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            {estadoStyle.label || r.estado}
                          </span>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#757575",
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <AlertCircle size={12} />
                            Incidentes
                          </div>
                          <div
                            style={{ fontSize: 14, fontWeight: 600 }}
                          >
                            {r.incidentes_abiertos > 0 ? (
                              <span style={{ color: "#E53935" }}>
                                {r.incidentes_abiertos} abiertos
                              </span>
                            ) : (
                              <span style={{ color: "#43A047" }}>
                                0 abiertos
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#757575",
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Shield size={12} />
                            Garantía
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: garantiaStyle.color,
                            }}
                          >
                            {garantiaStyle.label || "—"}
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          paddingTop: 16,
                          borderTop: "1px solid #E0E0E0",
                        }}
                      >
                        {r.pedido && (
                          <Link
                            to={`/pedidos/${r.pedido}`}
                            style={{
                              background: "#FAFAFA",
                              border: "1px solid #E0E0E0",
                              color: "#F57F17",
                              padding: "8px 14px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#FFF8E1";
                              e.currentTarget.style.borderColor = "#FFD54F";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#FAFAFA";
                              e.currentTarget.style.borderColor = "#E0E0E0";
                            }}
                          >
                            <ExternalLink size={13} /> Pedido
                          </Link>
                        )}
                        <button
                          style={{
                            background: "#FAFAFA",
                            border: "1px solid #E0E0E0",
                            color: "#212121",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.2s",
                          }}
                          onClick={() => verResumen(r)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#E8F5E9";
                            e.currentTarget.style.borderColor = "#81C784";
                            e.currentTarget.style.color = "#2E7D32";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#FAFAFA";
                            e.currentTarget.style.borderColor = "#E0E0E0";
                            e.currentTarget.style.color = "#212121";
                          }}
                        >
                          <Eye size={13} /> Resumen
                        </button>
                        <button
                          style={{
                            background: "#FAFAFA",
                            border: "1px solid #E0E0E0",
                            color: "#E53935",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.2s",
                            marginLeft: "auto",
                          }}
                          onClick={() => onDelete(r.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#E53935";
                            e.currentTarget.style.borderColor = "#E53935";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#FAFAFA";
                            e.currentTarget.style.borderColor = "#E0E0E0";
                            e.currentTarget.style.color = "#E53935";
                          }}
                        >
                          <Trash2 size={13} /> Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* PAGINACIÓN dorada */}
          {!loading && showData && totalPages > 1 && (
            <nav aria-label="Navegación de páginas" style={{ marginTop: 24 }}>
              <ul
                style={{
                  display: "flex",
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <li>
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    aria-label="Primera"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #FFE4A3",
                      background:
                        currentPage === 1 ? "#FFFBF0" : "#FFFFFF",
                      color:
                        currentPage === 1 ? "#BDBDBD" : "#A0522D",
                      cursor:
                        currentPage === 1 ? "not-allowed" : "pointer",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    «
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Anterior"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #FFE4A3",
                      background:
                        currentPage === 1 ? "#FFFBF0" : "#FFFFFF",
                      color:
                        currentPage === 1 ? "#BDBDBD" : "#A0522D",
                      cursor:
                        currentPage === 1 ? "not-allowed" : "pointer",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    ‹
                  </button>
                </li>

                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <li key={`ellipsis-${index}`}>
                      <span
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #FFE4A3",
                          background: "#FFFFFF",
                          color: "#9E9E9E",
                          borderRadius: "4px",
                          fontSize: "14px",
                          display: "inline-block",
                        }}
                      >
                        ...
                      </span>
                    </li>
                  ) : (
                    <li key={page}>
                      <button
                        onClick={() => goToPage(page)}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #FFE4A3",
                          background:
                            currentPage === page
                              ? "linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)"
                              : "#FFFFFF",
                          color:
                            currentPage === page ? "#5D4037" : "#A0522D",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight:
                            currentPage === page ? "700" : "600",
                        }}
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}

                <li>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Siguiente"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #FFE4A3",
                      background:
                        currentPage === totalPages
                          ? "#FFFBF0"
                          : "#FFFFFF",
                      color:
                        currentPage === totalPages
                          ? "#BDBDBD"
                          : "#A0522D",
                      cursor:
                        currentPage === totalPages
                          ? "not-allowed"
                          : "pointer",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    ›
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Última"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #FFE4A3",
                      background:
                        currentPage === totalPages
                          ? "#FFFBF0"
                          : "#FFFFFF",
                      color:
                        currentPage === totalPages
                          ? "#BDBDBD"
                          : "#A0522D",
                      cursor:
                        currentPage === totalPages
                          ? "not-allowed"
                          : "pointer",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    »
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* MODAL RESUMEN */}
      {resumen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 999,
            }}
            onClick={() => setResumen(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#FFFFFF",
              padding: 0,
              borderRadius: 16,
              maxWidth: 800,
              width: "90%",
              maxHeight: "85vh",
              overflow: "hidden",
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header modal */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)",
                padding: "24px 28px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#000",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  Alquiler #{resumen.id}
                </h2>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "rgba(0,0,0,0.7)",
                    fontSize: 14,
                  }}
                >
                  Resumen completo del alquiler
                </p>
              </div>
              <button
                onClick={() => setResumen(null)}
                style={{
                  background: "rgba(0,0,0,0.1)",
                  border: "none",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(0,0,0,0.2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(0,0,0,0.1)")
                }
              >
                <X size={20} color="#000" />
              </button>
            </div>

            {/* Contenido modal */}
            <div
              style={{
                padding: 28,
                maxHeight: "calc(85vh - 140px)",
                overflow: "auto",
              }}
            >
              {loadingResumen ? (
                <p
                  className="muted"
                  style={{ textAlign: "center", padding: 40 }}
                >
                  Cargando resumen…
                </p>
              ) : resumen.resumenData ? (
                <>
                  {/* INFO CLIENTE COMPLETA */}
                  <div
                    style={{
                      background: "#FAFAFA",
                      padding: 20,
                      borderRadius: 12,
                      marginBottom: 20,
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: "#757575",
                          }}
                        >
                          Cliente
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#212121",
                          }}
                        >
                          {resumen.resumenData.cliente}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: "#757575",
                          }}
                        >
                          Estado
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#212121",
                          }}
                        >
                          {ESTADO_COLORS[resumen.resumenData.estado]?.label ||
                            resumen.resumenData.estado}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: "#757575",
                          }}
                        >
                          Garantía
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: 16,
                            fontWeight: 600,
                            color:
                              GARANTIA_COLORS[
                                resumen.resumenData.garantia_estado
                              ]?.color || "#757575",
                          }}
                        >
                          {
                            GARANTIA_COLORS[
                              resumen.resumenData.garantia_estado
                            ]?.label || "—"
                          }
                        </p>
                      </div>
                      {resumen.resumenData.incidentes_abiertos > 0 && (
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              color: "#757575",
                            }}
                          >
                            Incidentes
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: 16,
                              fontWeight: 600,
                              color: "#E53935",
                            }}
                          >
                            {resumen.resumenData.incidentes_abiertos} abiertos
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STATS CARDS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    {/* Total del Alquiler */}
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #9FA8DA 0%, #7986CB 100%)",
                        padding: 20,
                        borderRadius: 12,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <DollarSign size={20} color="#fff" />
                          <span
                            style={{
                              fontSize: 13,
                              opacity: 0.9,
                              color: "#fff",
                            }}
                          >
                            Total Alquiler
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {fmt(
                            resumen.resumenData.totales.total_alquiler
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: -10,
                          bottom: -10,
                          opacity: 0.2,
                        }}
                      >
                        <DollarSign size={80} color="#fff" />
                      </div>
                    </div>

                    {/* Seña */}
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #81C784 0%, #66BB6A 100%)",
                        padding: 20,
                        borderRadius: 12,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <CheckCircle2 size={20} color="#fff" />
                          <span
                            style={{
                              fontSize: 13,
                              opacity: 0.9,
                              color: "#fff",
                            }}
                          >
                            Seña pagada
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {fmt(
                            resumen.resumenData.totales.senia_pagada
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: -10,
                          bottom: -10,
                          opacity: 0.2,
                        }}
                      >
                        <CheckCircle2 size={80} color="#fff" />
                      </div>
                    </div>

                    {/* Saldo pendiente */}
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)",
                        padding: 20,
                        borderRadius: 12,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <TrendingUp size={20} color="#000" />
                          <span
                            style={{
                              fontSize: 13,
                              opacity: 0.8,
                              color: "#000",
                            }}
                          >
                            Saldo pendiente
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#000",
                          }}
                        >
                          {fmt(
                            resumen.resumenData.totales.saldo_pendiente
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: -10,
                          bottom: -10,
                          opacity: 0.2,
                        }}
                      >
                        <TrendingUp size={80} color="#000" />
                      </div>
                    </div>

                    {/* Garantía cobrada */}
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%)",
                        padding: 20,
                        borderRadius: 12,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Shield size={20} color="#fff" />
                          <span
                            style={{
                              fontSize: 13,
                              opacity: 0.9,
                              color: "#fff",
                            }}
                          >
                            Garantía cobrada
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {fmt(
                            resumen.resumenData.totales.garantia_cobrada
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: -10,
                          bottom: -10,
                          opacity: 0.2,
                        }}
                      >
                        <Shield size={80} color="#fff" />
                      </div>
                    </div>
                  </div>

                  {/* COSTO INCIDENTES */}
                  {resumen.resumenData.totales.costo_incidentes > 0 && (
                    <div
                      style={{
                        background: "rgba(229, 57, 53, 0.1)",
                        border: "1px solid rgba(229, 57, 53, 0.3)",
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 20,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <AlertCircle size={24} color="#E53935" />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: 4,
                            color: "#212121",
                          }}
                        >
                          Costo de incidentes
                        </div>
                        <div
                          style={{ fontSize: 13, color: "#757575" }}
                        >
                          Se aplicaron cargos por daños o pérdidas
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#E53935",
                        }}
                      >
                        {fmt(
                          resumen.resumenData.totales.costo_incidentes
                        )}
                      </div>
                    </div>
                  )}

                  {/* TABLA DE PRODUCTOS */}
                  <div
                    style={{
                      background: "#FAFAFA",
                      padding: 20,
                      borderRadius: 12,
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    <h4
                      style={{
                        marginTop: 0,
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#212121",
                      }}
                    >
                      <Package size={20} />
                      Productos alquilados
                    </h4>
                    
                    {/* 🔧 FIX: Verificar que haya items antes de mostrar la tabla */}
                    {resumen.resumenData.items && resumen.resumenData.items.length > 0 ? (
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Producto</th>
                              <th>Cantidad</th>
                              <th>Precio unit.</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.resumenData.items.map((it) => (
                              <tr key={it.id}>
                                <td>{it.producto_nombre || "—"}</td>
                                <td>{it.cantidad}</td>
                                <td>{fmt(it.precio_unit)}</td>
                                <td style={{ fontWeight: 600 }}>
                                  {fmt(it.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: 20,
                          textAlign: "center",
                          color: "#757575",
                          fontSize: 14,
                        }}
                      >
                        No hay productos registrados en este alquiler
                      </div>
                    )}
                  </div>

                  {/* ALERTA FINALIZACIÓN */}
                  {resumen.resumenData.puede_finalizar && (
                    <div
                      style={{
                        background: "rgba(67, 160, 71, 0.1)",
                        border: "1px solid rgba(67, 160, 71, 0.3)",
                        padding: 16,
                        borderRadius: 12,
                        marginTop: 20,
                        textAlign: "center",
                      }}
                    >
                      <CheckCircle2
                        size={32}
                        color="#43A047"
                        style={{ marginBottom: 8 }}
                      />
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#43A047",
                          marginBottom: 4,
                        }}
                      >
                        Listo para finalizar
                      </div>
                      <div
                        style={{ fontSize: 13, color: "#757575" }}
                      >
                        Este alquiler puede finalizarse desde el detalle
                        del pedido.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#E53935",
                  }}
                >
                  <AlertCircle size={48} style={{ marginBottom: 16 }} />
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    No se pudo cargar el resumen
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}









