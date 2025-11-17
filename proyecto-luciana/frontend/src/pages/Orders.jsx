// src/pages/Orders.jsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import {
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle,
  PackageCheck,
  Ban,
  Eye,
  PencilLine,
  Lock,
  FileText,
  User,
  Calendar,
  X,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { confirm, error } from './alerts';

const ITEMS_PER_PAGE = 5;

/** Paleta dorado "normal" */
const GOLD_BG = '#FFF4C2';
const GOLD_BG_SOFT = '#FFF9DD';
const GOLD_GRAD_START = '#FFE29A';
const GOLD_GRAD_END = '#F0C66C';
const GOLD_BORDER = '#F0C66C';
const GOLD_ACCENT = '#D3A033';
const GOLD_TEXT = '#A66B00';

function EstadoBadge({ value }) {
  const map = {
    pendiente: {
      bg: GOLD_BG_SOFT,
      color: GOLD_TEXT,
      border: GOLD_BORDER,
      label: 'Pendiente',
    },
    confirmado: {
      bg: '#E1F5FE',
      color: '#0277BD',
      border: '#81D4FA',
      label: 'Confirmado',
    },
    entregado: {
      bg: '#E8F5E9',
      color: '#2E7D32',
      border: '#81C784',
      label: 'Entregado',
    },
    cancelado: {
      bg: '#FFEBEE',
      color: '#C62828',
      border: '#EF5350',
      label: 'Cancelado',
    },
  };
  const st = map[value] || map.pendiente;
  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: 12,
        background: st.bg,
        color: st.color,
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'capitalize',
        border: `1px solid ${st.border}`,
        display: 'inline-block',
      }}
    >
      {st.label || value || '—'}
    </span>
  );
}

function deleteNoPermitido(err) {
  const st = err?.response?.status;
  const detail = String(err?.response?.data?.detail || '');
  return st === 405 || st === 403 || /no está permitido|not allowed/i.test(detail);
}

export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Control de visibilidad
  const [mostrarLista, setMostrarLista] = useState(false);
  const [filtroRecientes, setFiltroRecientes] = useState(false);

  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [loadingCaja, setLoadingCaja] = useState(true);

  const [garantiaOpen, setGarantiaOpen] = useState(false);
  const [garantiaData, setGarantiaData] = useState(null);

  const [toast, setToast] = useState(null);
  const pushToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const verificarCaja = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/cajas/caja_abierta/');
      setCajaAbierta(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setCajaAbierta(null);
      }
    } finally {
      setLoadingCaja(false);
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/pedidos/');
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch {
      await error({
        title: 'Error al cargar',
        message: 'No se pudo cargar el listado de pedidos.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verificarCaja();
    fetchList();
  }, [fetchList, verificarCaja]);

  useEffect(() => {
    if (location.state?.created) {
      pushToast('success', 'Pedido creado exitosamente.');
      navigate('.', { replace: true, state: {} });
    }
    if (location.state?.updatedId) {
      pushToast('success', `Pedido #${location.state.updatedId} actualizado.`);
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const [qDebounced, setQDebounced] = useState('');
  const tRef = useRef();
  useEffect(() => {
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setQDebounced(q.trim().toLowerCase()), 250);
    return () => clearTimeout(tRef.current);
  }, [q]);

  // Cuando el usuario busca o filtra, mostramos la lista
  useEffect(() => {
    if (qDebounced || chip || filtroRecientes) {
      setMostrarLista(true);
    }
  }, [qDebounced, chip, filtroRecientes]);

  const counts = useMemo(() => {
    const c = { pendiente: 0, confirmado: 0, entregado: 0, cancelado: 0 };
    rows.forEach((r) => {
      if (c[r.estado] != null) c[r.estado] += 1;
    });
    return c;
  }, [rows]);

  // Filtro de recientes (últimos 15 pedidos)
  const recientesFiltrados = useMemo(() => {
    if (!filtroRecientes) return rows;
    return [...rows].sort((a, b) => b.id - a.id).slice(0, 15);
  }, [rows, filtroRecientes]);

  const chipFiltered = useMemo(() => {
    const base = filtroRecientes ? recientesFiltrados : rows;
    if (!chip) return base;
    return base.filter((r) => r.estado === chip);
  }, [rows, recientesFiltrados, chip, filtroRecientes]);

  const filtered = useMemo(() => {
    if (!qDebounced) return chipFiltered;
    return chipFiltered.filter((r) =>
      [r.id, r.cliente_nombre, r.estado]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(qDebounced))
    );
  }, [chipFiltered, qDebounced]);

  useEffect(() => {
    setCurrentPage(1);
  }, [qDebounced, chip, filtroRecientes]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filtered.slice(startIndex, endIndex);

  const HOURS_72 = 72 * 60 * 60 * 1000;
  const puedeEditar = (p) => {
    if (p.estado === 'cancelado' || p.estado === 'entregado') return false;
    if (!p.fecha_hora_evento) return true;
    const diff = new Date(p.fecha_hora_evento).getTime() - Date.now();
    return diff > HOURS_72;
  };
  const puedeCancelar = (p) => !(p.estado === 'cancelado' || p.estado === 'entregado');

  const cancelarPedido = async (id) => {
    const ok = await confirm({
      title: 'Cancelar pedido',
      message: `¿Querés marcar el pedido #${id} como cancelado?`,
      okText: 'Sí, cancelar',
      cancelText: 'No',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await axios.post(`/api/pedidos/${id}/cancelar/`);
      pushToast('success', `Pedido #${id} cancelado.`);
      fetchList();
    } catch (e) {
      const m = e?.response?.data ? JSON.stringify(e.response.data) : 'No se pudo cancelar.';
      await error({ title: 'Error', message: m });
    }
  };

  const eliminarPedido = async (id) => {
    const ok = await confirm({
      title: 'Eliminar pedido',
      message: `¿Eliminar definitivamente el pedido #${id}?`,
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/pedidos/${id}/`);
      pushToast('success', `Pedido #${id} eliminado.`);
      fetchList();
    } catch (e) {
      if (deleteNoPermitido(e)) {
        const ok2 = await confirm({
          title: 'Eliminar no permitido',
          message: 'El backend no permite borrar. ¿Cancelar el pedido en su lugar?',
          okText: 'Sí, cancelar',
          cancelText: 'No',
          tone: 'warn',
        });
        if (ok2) {
          await axios.post(`/api/pedidos/${id}/cancelar/`);
          pushToast('success', `Pedido #${id} cancelado.`);
          fetchList();
        }
        return;
      }
      const m = e?.response?.data ? JSON.stringify(e.response.data) : 'No se pudo eliminar.';
      await error({ title: 'Error', message: m });
    }
  };

  // presupuesto / factura
  const crearDocumento = async (pedido) => {
    const esPendiente = pedido.estado === 'pendiente';
    const esCancelado = pedido.estado === 'cancelado';

    if (esCancelado) return;

    const tipo = esPendiente ? 'presupuesto' : 'factura';

    const ok = await confirm({
      title: esPendiente ? 'Ver presupuesto' : 'Crear factura',
      message: esPendiente
        ? `¿Querés ver el presupuesto del pedido #${pedido.id}?`
        : `¿Crear la factura para el pedido #${pedido.id}?`,
      okText: 'Sí, continuar',
      cancelText: 'Cancelar',
      tone: 'success',
    });
    if (!ok) return;

    navigate(`/factura/pdf?tipo=${tipo}`, {
      state: {
        pedidoId: pedido.id,
        pedido,
      },
    });
  };

  const abrirGarantia = (row) => {
    setGarantiaData(row);
    setGarantiaOpen(true);
  };
  const cerrarGarantia = () => {
    setGarantiaOpen(false);
    setGarantiaData(null);
  };
  const money = (n) => `$ ${Number(n || 0).toLocaleString()}`;

  const Chip = ({ active, onClick, icon, label, count }) => (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 12,
        border: active ? `2px solid ${GOLD_ACCENT}` : `1px solid ${GOLD_BORDER}`,
        background: active ? GOLD_BG : '#fff',
        color: GOLD_TEXT,
        fontWeight: 600,
        fontSize: 14,
        textTransform: 'capitalize',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      title={active ? 'Quitar filtro' : `Filtrar por ${label}`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            marginLeft: 4,
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 999,
            background: active ? GOLD_ACCENT : '#f3f4f6',
            color: active ? '#fff' : '#6b7280',
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }

    return pages;
  };

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === 'success' ? '#43A047' : '#E53935',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        {/* Banner: No hay caja abierta */}
        {!loadingCaja && !cajaAbierta && (
          <div
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: '2px solid #b45309',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Lock size={24} color="#fff" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 16, color: '#fff', marginBottom: 4 }}>
                ⚠️ No hay caja abierta
              </div>
              <div style={{ fontSize: 14, color: '#fff', opacity: 0.95 }}>
                Debes abrir una caja antes de crear nuevos pedidos.
              </div>
            </div>
            <button
              onClick={() => navigate('/caja')}
              style={{
                padding: '10px 20px',
                background: '#fff',
                color: '#d97706',
                border: 'none',
                borderRadius: 8,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Ir a Caja
            </button>
          </div>
        )}

        {/* Header estilo similar a Products / Empleados */}
        <div
          className="emp-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 24, // más espacio con los filtros
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 22, // un poco más grande
                fontWeight: 700,
                color: '#111827',
              }}
            >
              Pedidos
            </h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
              Gestiona los pedidos de alquiler de productos
            </p>
          </div>

          <div
            className="emp-actions"
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div
              className="emp-search"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 12,
                background: '#fffdf2', // mismo tono que Products
                border: '1px solid #e2d18a',
                minWidth: 260,
              }}
            >
              <Search size={16} color="#c69724" />
              <input
                placeholder="Buscar por #, cliente o estado…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: '#111827',
                  width: '100%',
                }}
              />
            </div>

            {cajaAbierta ? (
              <Link
                to="/pedidos/nuevo"
                className="btn"
                style={{
                  background: GOLD_BG,
                  color: GOLD_TEXT,
                  fontWeight: 600,
                  border: `1px solid ${GOLD_BORDER}`,
                  textDecoration: 'none',
                  borderRadius: 12,
                  paddingInline: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={16} />
                Nuevo pedido
              </Link>
            ) : (
              <button
                className="btn"
                disabled
                style={{
                  background: '#F5F5F5',
                  color: '#9E9E9E',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                  borderRadius: 12,
                  paddingInline: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
                title="Debes abrir una caja primero"
              >
                <Lock size={16} />
                Nuevo pedido
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 24,
            padding: '16px 20px',
            background: GOLD_BG_SOFT,
            borderRadius: 8,
            border: `1px solid ${GOLD_BORDER}`,
          }}
        >
          <Chip
            active={filtroRecientes}
            onClick={() => {
              setFiltroRecientes(!filtroRecientes);
              if (!filtroRecientes) {
                setChip(''); // Limpiar filtro de estado
              }
            }}
            icon={<TrendingUp size={16} />}
            label="Más recientes"
          />

          <div style={{ width: '1px', background: GOLD_BORDER, margin: '0 4px' }} />

          <Chip
            active={chip === 'pendiente'}
            onClick={() => setChip(chip === 'pendiente' ? '' : 'pendiente')}
            icon={<Clock size={16} />}
            label="Pendiente"
            count={counts.pendiente}
          />
          <Chip
            active={chip === 'confirmado'}
            onClick={() => setChip(chip === 'confirmado' ? '' : 'confirmado')}
            icon={<CheckCircle size={16} />}
            label="Confirmado"
            count={counts.confirmado}
          />
          <Chip
            active={chip === 'entregado'}
            onClick={() => setChip(chip === 'entregado' ? '' : 'entregado')}
            icon={<PackageCheck size={16} />}
            label="Entregado"
            count={counts.entregado}
          />
          <Chip
            active={chip === 'cancelado'}
            onClick={() => setChip(chip === 'cancelado' ? '' : 'cancelado')}
            icon={<Ban size={16} />}
            label="Cancelado"
            count={counts.cancelado}
          />

          {(chip || filtroRecientes) && (
            <button
              onClick={() => {
                setChip('');
                setFiltroRecientes(false);
                setMostrarLista(false);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid #fecaca',
                background: '#fff',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contenido */}
        <div style={{ padding: '20px 0' }}>
          {loading && (
            <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
              Cargando…
            </p>
          )}

          {!loading && !mostrarLista && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#FAFAFA',
                borderRadius: 12,
                border: `2px dashed ${GOLD_BORDER}`,
              }}
            >
              <Filter size={48} color={GOLD_ACCENT} style={{ marginBottom: 16 }} />
              <h3 style={{ color: GOLD_TEXT, marginBottom: 8 }}>
                Usa los filtros o el buscador para ver pedidos
              </h3>
              <p style={{ color: '#757575', fontSize: 14, marginBottom: 20 }}>
                Selecciona "Más recientes" o filtra por estado para comenzar
              </p>
              <button
                onClick={() => setFiltroRecientes(true)}
                style={{
                  background: GOLD_BG,
                  color: GOLD_TEXT,
                  border: `2px solid ${GOLD_ACCENT}`,
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <TrendingUp size={18} />
                Ver pedidos más recientes
              </button>
            </div>
          )}

          {!loading && mostrarLista && filtered.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
              No se encontraron pedidos con los filtros aplicados.
            </p>
          )}

          {!loading && mostrarLista && filtered.length > 0 && (
            <>
              <div style={{ display: 'grid', gap: 16 }}>
                {paginatedData.map((r) => {
                  const gradientMap = {
                    pendiente: `linear-gradient(135deg, ${GOLD_GRAD_START} 0%, ${GOLD_GRAD_END} 100%)`,
                    confirmado: 'linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%)',
                    entregado: 'linear-gradient(135deg, #81C784 0%, #66BB6A 100%)',
                    cancelado: 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)',
                  };

                  const headerColorMap = {
                    pendiente: GOLD_TEXT,
                    confirmado: '#fff',
                    entregado: '#fff',
                    cancelado: '#fff',
                  };

                  return (
                    <div
                      key={r.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E0E0E0',
                        borderRadius: 12,
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 8px 24px rgba(211,160,51,0.3)`;
                        e.currentTarget.style.borderColor = GOLD_ACCENT;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = '#E0E0E0';
                      }}
                    >
                      {/* Header tarjeta */}
                      <div
                        style={{
                          background: gradientMap[r.estado] || gradientMap.pendiente,
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: 20,
                              fontWeight: 700,
                              color: headerColorMap[r.estado] || GOLD_TEXT,
                            }}
                          >
                            Pedido #{r.id}
                          </h4>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 4,
                              opacity: 0.95,
                            }}
                          >
                            <User size={14} color={headerColorMap[r.estado] || GOLD_TEXT} />
                            <span
                              style={{
                                fontSize: 14,
                                color: headerColorMap[r.estado] || GOLD_TEXT,
                              }}
                            >
                              {r.cliente_nombre || r.cliente || '—'}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 24,
                              fontWeight: 700,
                              color: headerColorMap[r.estado] || GOLD_TEXT,
                            }}
                          >
                            {money(r.total)}
                          </div>
                        </div>
                      </div>

                      {/* Contenido tarjeta */}
                      <div style={{ padding: 20 }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 16,
                            marginBottom: 16,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#757575',
                                marginBottom: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Calendar size={12} />
                              Fecha evento
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#212121' }}>
                              {r.fecha_hora_evento
                                ? new Date(r.fecha_hora_evento).toLocaleDateString('es-AR')
                                : '—'}
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#757575',
                                marginBottom: 4,
                              }}
                            >
                              Estado
                            </div>
                            <EstadoBadge value={r.estado} />
                          </div>

                          {r.senia > 0 && (
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#757575',
                                  marginBottom: 4,
                                }}
                              >
                                Seña
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: '#43A047',
                                }}
                              >
                                {money(r.senia)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                            paddingTop: 16,
                            borderTop: '1px solid #E0E0E0',
                          }}
                        >
                          <button
                            onClick={() => navigate(`/pedidos/${r.id}`)}
                            style={{
                              background: '#E3F2FD',
                              border: '1px solid #2196F3',
                              color: '#1976D2',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s',
                            }}
                          >
                            <Eye size={13} /> Ver detalle
                          </button>

                          <button
                            onClick={() => navigate(`/pedidos/${r.id}/editar`)}
                            disabled={!puedeEditar(r) || !cajaAbierta}
                            style={{
                              background: GOLD_BG,
                              border: `1px solid ${GOLD_BORDER}`,
                              color: GOLD_TEXT,
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor:
                                !puedeEditar(r) || !cajaAbierta ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s',
                              opacity: !puedeEditar(r) || !cajaAbierta ? 0.5 : 1,
                            }}
                            title={
                              !cajaAbierta
                                ? 'No hay caja abierta'
                                : !puedeEditar(r)
                                ? 'No editable'
                                : 'Editar pedido'
                            }
                          >
                            <PencilLine size={13} /> Editar
                          </button>

                          {/* Presupuesto / Factura */}
                          <button
                            onClick={() => crearDocumento(r)}
                            disabled={r.estado === 'cancelado'}
                            style={{
                              background: '#FAFAFA',
                              border: '1px solid #E0E0E0',
                              color:
                                r.estado === 'cancelado'
                                  ? '#9E9E9E'
                                  : r.estado === 'pendiente'
                                  ? '#f59e0b'
                                  : '#10b981',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: r.estado === 'cancelado' ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s',
                              opacity: r.estado === 'cancelado' ? 0.5 : 1,
                            }}
                            title={
                              r.estado === 'pendiente'
                                ? 'Ver presupuesto (pedido pendiente)'
                                : r.estado === 'cancelado'
                                ? 'Documento no disponible'
                                : 'Crear factura'
                            }
                            onMouseEnter={(e) => {
                              if (r.estado === 'cancelado') return;
                              if (r.estado === 'pendiente') {
                                e.currentTarget.style.background = '#FFF8E1';
                                e.currentTarget.style.borderColor = '#f59e0b';
                              } else {
                                e.currentTarget.style.background = '#E8F5E9';
                                e.currentTarget.style.borderColor = '#10b981';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FAFAFA';
                              e.currentTarget.style.borderColor = '#E0E0E0';
                            }}
                          >
                            <FileText size={13} />{' '}
                            {r.estado === 'pendiente' ? 'Presupuesto' : 'Factura'}
                          </button>

                          <button
                            onClick={() => cancelarPedido(r.id)}
                            disabled={!puedeCancelar(r)}
                            style={{
                              background: '#FAFAFA',
                              border: '1px solid #E0E0E0',
                              color: !puedeCancelar(r) ? '#9E9E9E' : '#f59e0b',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: !puedeCancelar(r) ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s',
                              opacity: !puedeCancelar(r) ? 0.5 : 1,
                            }}
                            title={
                              !puedeCancelar(r)
                                ? 'Ya está cancelado/entregado'
                                : 'Cancelar pedido'
                            }
                            onMouseEnter={(e) => {
                              if (puedeCancelar(r)) {
                                e.currentTarget.style.background = '#FFF8E1';
                                e.currentTarget.style.borderColor = '#f59e0b';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FAFAFA';
                              e.currentTarget.style.borderColor = '#E0E0E0';
                            }}
                          >
                            <Ban size={13} /> Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <nav aria-label="Navegación de páginas" style={{ marginTop: 24 }}>
                  <ul
                    style={{
                      display: 'flex',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {/* Primera */}
                    <li>
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        aria-label="Primera"
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${GOLD_BORDER}`,
                          background: currentPage === 1 ? GOLD_BG_SOFT : '#FFFFFF',
                          color: currentPage === 1 ? '#BDBDBD' : GOLD_TEXT,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 600,
                          opacity: currentPage === 1 ? 0.5 : 1,
                        }}
                      >
                        «
                      </button>
                    </li>

                    {/* Anterior */}
                    <li>
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Anterior"
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${GOLD_BORDER}`,
                          background: currentPage === 1 ? GOLD_BG_SOFT : '#FFFFFF',
                          color: currentPage === 1 ? '#BDBDBD' : GOLD_TEXT,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 600,
                          opacity: currentPage === 1 ? 0.5 : 1,
                        }}
                      >
                        ‹
                      </button>
                    </li>

                    {/* Números */}
                    {getPageNumbers().map((page, index) =>
                      page === '...' ? (
                        <li key={`ellipsis-${index}`}>
                          <span
                            style={{
                              padding: '8px 12px',
                              border: `1px solid ${GOLD_BORDER}`,
                              background: '#FFFFFF',
                              color: '#9E9E9E',
                              borderRadius: '4px',
                              fontSize: '14px',
                              display: 'inline-block',
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
                              padding: '8px 12px',
                              border: `1px solid ${GOLD_BORDER}`,
                              background: currentPage === page ? GOLD_BG : '#FFFFFF',
                              color: currentPage === page ? GOLD_TEXT : '#C19A6B',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontWeight: currentPage === page ? 700 : 600,
                              boxShadow:
                                currentPage === page
                                  ? '0 2px 4px rgba(212,175,55,0.2)'
                                  : 'none',
                            }}
                          >
                            {page}
                          </button>
                        </li>
                      )
                    )}

                    {/* Siguiente */}
                    <li>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Siguiente"
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${GOLD_BORDER}`,
                          background: currentPage === totalPages ? GOLD_BG_SOFT : '#FFFFFF',
                          color: currentPage === totalPages ? '#BDBDBD' : GOLD_TEXT,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 600,
                          opacity: currentPage === totalPages ? 0.5 : 1,
                        }}
                      >
                        ›
                      </button>
                    </li>

                    {/* Última */}
                    <li>
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        aria-label="Última"
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${GOLD_BORDER}`,
                          background: currentPage === totalPages ? GOLD_BG_SOFT : '#FFFFFF',
                          color: currentPage === totalPages ? '#BDBDBD' : GOLD_TEXT,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          fontSize: '14px',
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
            </>
          )}
        </div>
      </div>

      {/* Modal de garantía */}
      {garantiaOpen && garantiaData && (
        <>
          <div
            onClick={cerrarGarantia}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              padding: 0,
              borderRadius: 16,
              maxWidth: 620,
              width: '90%',
              maxHeight: '85vh',
              overflow: 'hidden',
              zIndex: 1000,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header modal */}
            <div
              style={{
                background: GOLD_BG_SOFT,
                padding: '24px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `2px solid ${GOLD_BORDER}`,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: GOLD_TEXT,
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  🛡️ Garantía - Pedido #{garantiaData.id}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    color: '#C19A6B',
                    fontSize: 14,
                  }}
                >
                  Información de garantía y saldos
                </p>
              </div>
              <button
                onClick={cerrarGarantia}
                style={{
                  background: 'rgba(166,107,0,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(166,107,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(166,107,0,0.1)';
                }}
              >
                <X size={20} color={GOLD_TEXT} />
              </button>
            </div>

            {/* Contenido modal */}
            <div
              style={{
                padding: 28,
                maxHeight: 'calc(85vh - 140px)',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: 16,
                  background: '#FAFAFA',
                  padding: 20,
                  borderRadius: 12,
                  border: '1px solid #E0E0E0',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>
                    Cliente
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {garantiaData.cliente_nombre || garantiaData.cliente || '—'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>
                      Total del pedido
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#212121',
                      }}
                    >
                      {money(garantiaData.total)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>
                      Seña registrada
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#43A047',
                      }}
                    >
                      {money(garantiaData.senia)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: GOLD_BG_SOFT,
                    padding: 16,
                    borderRadius: 8,
                    border: `1px solid ${GOLD_BORDER}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: GOLD_TEXT,
                      marginBottom: 4,
                    }}
                  >
                    Saldo estimado
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: GOLD_TEXT,
                    }}
                  >
                    {money((garantiaData.total || 0) - (garantiaData.senia || 0))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#E3F2FD',
                  padding: 20,
                  borderRadius: 12,
                  border: '1px solid #90CAF9',
                }}
              >
                <h4
                  style={{
                    marginTop: 0,
                    marginBottom: 12,
                    color: '#1565C0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <ShieldCheck size={20} />
                  Información de Garantía
                </h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#1976D2', marginBottom: 4 }}>
                      Monto de garantía
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#0D47A1',
                      }}
                    >
                      {garantiaData.garantia_monto != null
                        ? money(garantiaData.garantia_monto)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#1976D2', marginBottom: 4 }}>
                      Estado de garantía
                    </div>
                    <EstadoBadge value={garantiaData.garantia_estado} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div
              style={{
                padding: '20px 28px',
                borderTop: '1px solid #E0E0E0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <button
                onClick={() => navigate(`/pedidos/${garantiaData.id}`)}
                style={{
                  background: '#FFFFFF',
                  color: GOLD_TEXT,
                  border: `1px solid ${GOLD_BORDER}`,
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = GOLD_BG_SOFT;
                  e.target.style.borderColor = GOLD_ACCENT;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#FFFFFF';
                  e.target.style.borderColor = GOLD_BORDER;
                }}
              >
                Ver detalles
              </button>
              <button
                onClick={cerrarGarantia}
                style={{
                  background: GOLD_BG,
                  color: GOLD_TEXT,
                  border: `1px solid ${GOLD_BORDER}`,
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}



