// src/pages/Pagos.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  AlertCircle,
  Clock,
  FileText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Tag,
  Filter as FilterIcon,
} from "lucide-react";

const TIPO_PAGO_LABEL = {
  SENIA: "Seña",
  SALDO: "Saldo",
  GARANTIA: "Garantía cobrada",
  DEVOLUCION_GARANTIA: "Devolución garantía",
  APLICACION_GARANTIA: "Garantía aplicada",
  COMPRA_INSUMOS: "Compra de insumos",
  PAGO_TRABAJADORES: "Pago a trabajadores",
  SERVICIOS: "Servicios",
  MANTENIMIENTO: "Mantenimiento",
  OTRO_INGRESO: "Otro ingreso",
  OTRO_EGRESO: "Otro egreso",
};

const METODO_PAGO_LABEL = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",

};

const ITEMS_PER_PAGE = 4;

export default function Pagos() {
  const navigate = useNavigate();

  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // sortMode: '' | 'RECENT' | 'INGRESO' | 'EGRESO'
  const [sortMode, setSortMode] = useState("");
  // dateFilter: '' | 'today' | 'week' | 'month' | 'all'
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [mostrarLista, setMostrarLista] = useState(false);

  useEffect(() => {
    fetchPagos();
  }, []);

  async function fetchPagos() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/pagos/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setPagos(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron obtener los pagos.");
    } finally {
      setLoading(false);
    }
  }

  function formatFecha(f) {
    if (!f) return "-";
    const d = new Date(f);
    if (Number.isNaN(d.getTime())) return f;
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderOrigen(p) {
    if (p.pedido) return `Pedido #${p.pedido}`;
    if (p.alquiler) return `Alquiler #${p.alquiler}`;
    return "Extraordinario";
  }

  function renderCliente(p) {
    const cliente = p.cliente_nombre || p.cliente?.nombre || p.cliente || "-";
    return String(cliente);
  }

  // Cuando toca buscador / filtros, mostramos la lista (privacidad)
  useEffect(() => {
    if (search.trim() || sortMode || dateFilter) {
      setMostrarLista(true);
    }
  }, [search, sortMode, dateFilter]);

  // Filtrado + orden
  const pagosFiltrados = useMemo(() => {
    let result = [...pagos];

    // Búsqueda
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((p) => {
        const cliente = renderCliente(p).toLowerCase();
        const origen = renderOrigen(p).toLowerCase();
        const comp = String(p.comprobante_pago || "").toLowerCase();
        const nota = String(p.notas || "").toLowerCase();
        const monto = String(p.monto || "");

        return (
          cliente.includes(s) ||
          origen.includes(s) ||
          comp.includes(s) ||
          nota.includes(s) ||
          monto.includes(s)
        );
      });
    }

    // Filtro por fecha
    if (dateFilter) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        result = result.filter((p) => {
          const d = new Date(p.fecha_pago);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === hoy.getTime();
        });
      } else if (dateFilter === "week") {
        const inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 7);
        result = result.filter((p) => {
          const d = new Date(p.fecha_pago);
          return d >= inicio && d <= hoy;
        });
      } else if (dateFilter === "month") {
        const mes = hoy.getMonth();
        const año = hoy.getFullYear();
        result = result.filter((p) => {
          const d = new Date(p.fecha_pago);
          return d.getMonth() === mes && d.getFullYear() === año;
        });
      } // 'all' => sin restricción extra
    }

    // Orden / filtro por tipo de movimiento
    if (sortMode === "INGRESO") {
      result = result.filter((p) => p.sentido === "INGRESO");
      result.sort(
        (a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)
      );
    } else if (sortMode === "EGRESO") {
      result = result.filter((p) => p.sentido === "EGRESO");
      result.sort(
        (a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)
      );
    } else if (sortMode === "RECENT") {
      result.sort(
        (a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)
      );
    }

    return result;
  }, [pagos, search, sortMode, dateFilter]);

  // Estadísticas sobre lo filtrado
  const stats = useMemo(() => {
    const ingresos = pagosFiltrados
      .filter((p) => p.sentido === "INGRESO")
      .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

    const egresos = pagosFiltrados
      .filter((p) => p.sentido === "EGRESO")
      .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

    return {
      totalIngresos: ingresos,
      totalEgresos: egresos,
      balance: ingresos - egresos,
      cantidadPagos: pagosFiltrados.length,
    };
  }, [pagosFiltrados]);

  // Paginación
  const totalPages = Math.ceil(pagosFiltrados.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pagosPaginados = pagosFiltrados.slice(startIndex, endIndex);

  // Reset page cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode, dateFilter]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }
    return pages;
  };

  const resetFiltros = () => {
    setSearch("");
    setSortMode("");
    setDateFilter("");
    setMostrarLista(false);
  };

  return (
    <Layout title="Historial de Pagos">
      <div className="ent-card" style={{ background: "#FFFFFF" }}>
        {/* Header */}
        <div className="ent-header">
          <div className="ent-header-title">
            <h2 style={{ color: "#212121" }}>Historial de Pagos</h2>
            <p style={{ color: "#757575" }}>
              Movimientos de señas, saldos y garantías asociados a alquileres
            </p>
          </div>

          <div
            className="ent-toolbar"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Buscador en header (como tu 2da imagen) */}
            <div
              style={{
                position: "relative",
                minWidth: 260,
              }}
            >
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#B0B0B0",
                }}
              />
              <input
                type="text"
                placeholder="Buscar por cliente, origen, referencia o notas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "8px 12px 8px 36px",
                  borderRadius: 10,
                  border: "1px solid #E0E0E0",
                  fontSize: 14,
                  width: "100%",
                  background: "#FFFEF7",
                }}
              />
            </div>

            <button
              className="ent-refresh"
              onClick={fetchPagos}
              disabled={loading}
              style={{
                background: "#FAFAFA",
                border: "1px solid #E0E0E0",
                color: "#F57F17",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} />
            </button>

            <button
              className="ent-btn-primary"
              onClick={() => navigate("/pagos/nuevo")}
              style={{
                background:
                  "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)",
                color: "#000",
                fontWeight: 600,
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + Nuevo Pago
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #81C784 0%, #66BB6A 100%)",
              borderRadius: 12,
              padding: 20,
              color: "white",
              boxShadow: "0 4px 12px rgba(129,199,132,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <span
                  style={{ opacity: 0.95, fontSize: 13, fontWeight: 500 }}
                >
                  Ingresos
                </span>
              </div>
              <p style={{ fontSize: 26, fontWeight: "bold", margin: 0 }}>
                $
                {stats.totalIngresos.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div
              style={{ position: "absolute", right: -15, bottom: -15, opacity: 0.15 }}
            >
              <TrendingUp size={80} />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #EF5350 0%, #E53935 100%)",
              borderRadius: 12,
              padding: 20,
              color: "white",
              boxShadow: "0 4px 12px rgba(239,83,80,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <TrendingDown size={20} />
                </div>
                <span
                  style={{ opacity: 0.95, fontSize: 13, fontWeight: 500 }}
                >
                  Egresos
                </span>
              </div>
              <p style={{ fontSize: 26, fontWeight: "bold", margin: 0 }}>
                $
                {stats.totalEgresos.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div
              style={{ position: "absolute", right: -15, bottom: -15, opacity: 0.15 }}
            >
              <TrendingDown size={80} />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)",
              borderRadius: 12,
              padding: 20,
              color: "#000",
              boxShadow: "0 4px 12px rgba(255,213,79,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    background: "rgba(0,0,0,0.1)",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <DollarSign size={20} />
                </div>
                <span
                  style={{ opacity: 0.85, fontSize: 13, fontWeight: 600 }}
                >
                  Balance
                </span>
              </div>
              <p style={{ fontSize: 26, fontWeight: "bold", margin: 0 }}>
                $
                {stats.balance.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div
              style={{ position: "absolute", right: -15, bottom: -15, opacity: 0.15 }}
            >
              <DollarSign size={80} />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #9FA8DA 0%, #7986CB 100%)",
              borderRadius: 12,
              padding: 20,
              color: "white",
              boxShadow: "0 4px 12px rgba(159,168,218,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <FileText size={20} />
                </div>
                <span
                  style={{ opacity: 0.95, fontSize: 13, fontWeight: 500 }}
                >
                  Total Pagos
                </span>
              </div>
              <p style={{ fontSize: 26, fontWeight: "bold", margin: 0 }}>
                {stats.cantidadPagos}
              </p>
            </div>
            <div
              style={{ position: "absolute", right: -15, bottom: -15, opacity: 0.15 }}
            >
              <FileText size={80} />
            </div>
          </div>
        </div>

        {/* Filtros principales: Más recientes / Ingresos / Egresos */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            padding: "14px 18px",
            background: "linear-gradient(135deg, #FFFBF0 0%, #FFF5E1 100%)",
            borderRadius: 10,
            alignItems: "center",
            flexWrap: "wrap",
            border: "1px solid #FFE4A3",
          }}
        >
          <button
            onClick={() =>
              setSortMode((prev) => (prev === "RECENT" ? "" : "RECENT"))
            }
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border:
                sortMode === "RECENT"
                  ? "2px solid #DEB887"
                  : "1px solid #FFE4A3",
              background:
                sortMode === "RECENT"
                  ? "linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)"
                  : "#FFFFFF",
              color: sortMode === "RECENT" ? "#8B4513" : "#A0522D",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Clock size={16} />
            Más recientes
          </button>

          <button
            onClick={() =>
              setSortMode((prev) => (prev === "INGRESO" ? "" : "INGRESO"))
            }
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border:
                sortMode === "INGRESO"
                  ? "2px solid #16a34a"
                  : "1px solid #BBF7D0",
              background:
                sortMode === "INGRESO" ? "#DCFCE7" : "#FFFFFF",
              color: "#166534",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <TrendingUp size={16} />
            Solo ingresos
          </button>

          <button
            onClick={() =>
              setSortMode((prev) => (prev === "EGRESO" ? "" : "EGRESO"))
            }
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border:
                sortMode === "EGRESO"
                  ? "2px solid #f97316"
                  : "1px solid #FED7AA",
              background:
                sortMode === "EGRESO" ? "#FFEDD5" : "#FFFFFF",
              color: "#9A3412",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <TrendingDown size={16} />
            Solo egresos
          </button>

          {/* Filtro fechas */}
          <div
            style={{
              width: 1,
              height: 26,
              background: "#FFE4A3",
              margin: "0 4px",
            }}
          />

          {["all", "today", "week", "month"].map((opt) => {
            const label =
              opt === "all"
                ? "Todos"
                : opt === "today"
                ? "Hoy"
                : opt === "week"
                ? "Esta semana"
                : "Este mes";
            const active = dateFilter === opt;
            return (
              <button
                key={opt}
                onClick={() =>
                  setDateFilter((prev) => (prev === opt ? "" : opt))
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: active
                    ? "2px solid #DEB887"
                    : "1px solid #FFE4A3",
                  background: active ? "#FFF4D6" : "#FFFFFF",
                  color: active ? "#8B4513" : "#A0522D",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}

          {(sortMode || dateFilter || search.trim()) && (
            <button
              onClick={resetFiltros}
              style={{
                marginLeft: "auto",
                padding: "8px 18px",
                borderRadius: 999,
                border: "2px solid #fecaca",
                background: "#fff",
                color: "#ef4444",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Mensajes de error */}
        {error && (
          <div
            style={{
              background: "#FFEBEE",
              border: "2px solid #EF5350",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#C62828",
            }}
          >
            <AlertCircle size={20} />
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Lista / privacidad */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "#757575",
              }}
            >
              <RefreshCw
                size={20}
                className="spin"
                color="#F57F17"
              />
              <span style={{ fontSize: 15, fontWeight: 500 }}>
                Cargando pagos...
              </span>
            </div>
          </div>
        ) : !mostrarLista ? (
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
              Usa los filtros o el buscador para ver pagos
            </h3>
            <p
              style={{
                color: "#757575",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              Seleccioná "Más recientes", filtrá por tipo o buscá por
              cliente para comenzar.
            </p>
            <button
              onClick={() => {
                setSortMode("RECENT");
                setMostrarLista(true);
              }}
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
              <Clock size={18} />
              Ver pagos más recientes
            </button>
          </div>
        ) : pagosPaginados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <DollarSign size={48} color="#E0E0E0" />
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  color: "#212121",
                  fontSize: 16,
                }}
              >
                No hay pagos que coincidan
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#757575",
                }}
              >
                Intentá ajustar los filtros de búsqueda
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tarjetas de pagos */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginBottom: 30,
              }}
            >
              {pagosPaginados.map((p) => (
                <div
                  key={p.id_pago}
                  style={{
                    background:
                      p.sentido === "INGRESO"
                        ? "linear-gradient(135deg, #FFF9E6 0%, #FFF3D6 100%)"
                        : "linear-gradient(135deg, #FFE8E8 0%, #FFD6D6 100%)",
                    border: "2px solid",
                    borderColor:
                      p.sentido === "INGRESO" ? "#FFD54F" : "#FFCDD2",
                    borderRadius: 12,
                    padding: 24,
                    transition: "all 0.3s",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Header tarjeta */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: "bold",
                          color: "#212121",
                          marginBottom: 6,
                        }}
                      >
                        Pago #{p.id_pago}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#757575",
                          fontSize: 13,
                        }}
                      >
                        <User size={14} />
                        <span style={{ fontWeight: 500 }}>
                          {renderCliente(p)}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: "bold",
                          color:
                            p.sentido === "INGRESO"
                              ? "#43A047"
                              : "#E53935",
                          marginBottom: 4,
                        }}
                      >
                        {p.sentido === "INGRESO" ? "+" : "-"}$
                        {parseFloat(p.monto || 0).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          background:
                            p.sentido === "INGRESO"
                              ? "linear-gradient(135deg, #81C784 0%, #66BB6A 100%)"
                              : "linear-gradient(135deg, #EF5350 0%, #E53935 100%)",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {p.sentido}
                      </div>
                    </div>
                  </div>

                  {/* Contenido tarjeta */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 20,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9E9E9E",
                          fontWeight: 600,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        <FileText
                          size={12}
                          style={{
                            display: "inline",
                            marginRight: 4,
                          }}
                        />
                        Origen
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#212121",
                          fontWeight: 600,
                        }}
                      >
                        {renderOrigen(p)}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9E9E9E",
                          fontWeight: 600,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        <Tag
                          size={12}
                          style={{
                            display: "inline",
                            marginRight: 4,
                          }}
                        />
                        Tipo de Pago
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#212121",
                          fontWeight: 500,
                        }}
                      >
                        {TIPO_PAGO_LABEL[p.tipo_pago] || p.tipo_pago}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9E9E9E",
                          fontWeight: 600,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        <CreditCard
                          size={12}
                          style={{
                            display: "inline",
                            marginRight: 4,
                          }}
                        />
                        Método
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          background: "#FFFFFF",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#616161",
                          border: "1px solid #E0E0E0",
                        }}
                      >
                        {METODO_PAGO_LABEL[p.metodo_pago] ||
                          p.metodo_pago}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9E9E9E",
                          fontWeight: 600,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        <Calendar
                          size={12}
                          style={{
                            display: "inline",
                            marginRight: 4,
                          }}
                        />
                        Fecha
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#757575",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Clock size={14} color="#F57F17" />
                        {formatFecha(p.fecha_pago)}
                      </div>
                    </div>
                  </div>

                  {/* Footer adicional */}
                  {(p.comprobante_pago || p.notas) && (
                    <div
                      style={{
                        paddingTop: 16,
                        borderTop: "1px solid rgba(0,0,0,0.1)",
                        display: "flex",
                        gap: 24,
                        flexWrap: "wrap",
                      }}
                    >
                      {p.comprobante_pago && (
                        <div style={{ flex: "1 1 200px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#9E9E9E",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            Referencia:
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#616161",
                              marginLeft: 8,
                              fontWeight: 500,
                            }}
                          >
                            {p.comprobante_pago}
                          </span>
                        </div>
                      )}
                      {p.notas && (
                        <div style={{ flex: "1 1 200px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#9E9E9E",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            Notas:
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#616161",
                              marginLeft: 8,
                              fontStyle: "italic",
                            }}
                          >
                            {p.notas}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 40,
                  paddingTop: 24,
                  borderTop: "2px solid #F5F5F5",
                }}
              >
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  style={{
                    background:
                      currentPage === 1 ? "#F5F5F5" : "#FFFFFF",
                    border: "2px solid #E0E0E0",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor:
                      currentPage === 1 ? "not-allowed" : "pointer",
                    color:
                      currentPage === 1 ? "#BDBDBD" : "#212121",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ChevronLeft size={18} />
                </button>

                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      style={{
                        padding: "8px 12px",
                        color: "#9E9E9E",
                        fontWeight: 600,
                      }}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        background:
                          currentPage === page
                            ? "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)"
                            : "#FFFFFF",
                        border: "2px solid",
                        borderColor:
                          currentPage === page
                            ? "#FFA726"
                            : "#E0E0E0",
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor: "pointer",
                        color:
                          currentPage === page ? "#000" : "#212121",
                        fontWeight:
                          currentPage === page ? 700 : 500,
                        minWidth: 40,
                      }}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    background:
                      currentPage === totalPages
                        ? "#F5F5F5"
                        : "#FFFFFF",
                    border: "2px solid #E0E0E0",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor:
                      currentPage === totalPages
                        ? "not-allowed"
                        : "pointer",
                    color:
                      currentPage === totalPages
                        ? "#BDBDBD"
                        : "#212121",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
