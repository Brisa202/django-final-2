// src/pages/Incidents.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import {
  Plus,
  Search,
  AlertTriangle,
  Eye,
  TrendingUp,
  Filter as FilterIcon,
  Trash2,
  CheckCircle,
  Package,
} from 'lucide-react';
import { confirm, success, error } from './alerts';

const ITEMS_PER_PAGE = 5;

export default function Incidents() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtros
  const [filterStatus, setFilterStatus] = useState(''); // '', abiertos, resueltos
  const [mostrarLista, setMostrarLista] = useState(false);
  const [filtroRecientes, setFiltroRecientes] = useState(false);

  // Modal detalles
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);

  // Modal cierre
  const [closing, setClosing] = useState(null);
  const [closeResult, setCloseResult] = useState('reintegrado');
  const [cantidadRep, setCantidadRep] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/incidentes/');
      const list = Array.isArray(data) ? data : data.results || [];
      setRows(list);
      setErr('');
    } catch {
      setErr('No se pudo cargar el listado de incidentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Cuando busca o filtra mostramos la lista (privacidad)
  useEffect(() => {
    if (q.trim() || filterStatus || filtroRecientes) {
      setMostrarLista(true);
    }
  }, [q, filterStatus, filtroRecientes]);

  // Filtro "más recientes"
  const recientesFiltrados = useMemo(() => {
    if (!filtroRecientes) return rows;
    return [...rows]
      .sort(
        (a, b) =>
          new Date(b.fecha_incidente || b.id) -
          new Date(a.fecha_incidente || a.id)
      )
      .slice(0, 20);
  }, [rows, filtroRecientes]);

  // Filtros + búsqueda
  const filtered = useMemo(() => {
    let result = filtroRecientes ? recientesFiltrados : rows;

    if (filterStatus === 'abiertos') {
      result = result.filter((r) => r.estado_incidente === 'abierto');
    } else if (filterStatus === 'resueltos') {
      result = result.filter((r) => r.estado_incidente === 'resuelto');
    }

    const term = q.trim().toLowerCase();
    if (term) {
      result = result.filter((r) =>
        [
          r.producto_nombre,
          r.descripcion,
          r.estado_incidente,
          r.tipo_incidente,
          r.resultado_final,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );
    }

    return result;
  }, [rows, recientesFiltrados, q, filterStatus, filtroRecientes]);

  // Reset paginación
  useEffect(() => {
    setCurrentPage(1);
  }, [q, filterStatus, filtroRecientes]);

  // Paginación
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Estadísticas
  const stats = useMemo(() => {
    const total = rows.length;
    const abiertos = rows.filter((r) => r.estado_incidente === 'abierto')
      .length;
    const resueltos = rows.filter((r) => r.estado_incidente === 'resuelto')
      .length;
    return { total, abiertos, resueltos };
  }, [rows]);

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
      pages.push(
        1,
        '...',
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages
      );
    }

    return pages;
  };

  const formatDate = (value, withTime = false) => {
    if (!value) return '—';
    const d = new Date(value);
    return d.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  };

  // ---- Acciones: ver detalles ----
  const openDetails = (row) => {
    setDetails(row);
    setDetailsOpen(true);
  };

  // ---- Acciones: cerrar incidente ----
  const openCloseModal = (row) => {
    setClosing(row);
    // por defecto: si es irreparable → repuesto; si no, reintegrado
    setCloseResult(row.tipo_incidente === 'irreparable' ? 'repuesto' : 'reintegrado');
    setCantidadRep('');
  };

  const doClose = async () => {
    if (!closing) return;

    // reglas de negocio básicas (igual que backend)
    if (closeResult === 'reintegrado' && closing.tipo_incidente === 'irreparable') {
      await error({
        title: 'Acción inválida',
        message: 'Un incidente irreparable no puede reintegrarse al stock.',
      });
      return;
    }

    let cantReponer = Number(cantidadRep || 0);
    const afectada = Number(closing.cantidad_afectada || 0);

    if (closeResult === 'repuesto') {
      if (!Number.isInteger(cantReponer) || cantReponer <= 0) {
        cantReponer = afectada;
      }
      if (cantReponer > afectada) {
        await error({
          title: 'Cantidad inválida',
          message: `No podés reponer más de ${afectada}.`,
        });
        return;
      }
    }

    try {
      const payload = {
        estado_incidente: 'resuelto',
        resultado_final: closeResult,
      };
      if (closeResult === 'repuesto') {
        payload.cantidad_repuesta = cantReponer;
      }

      await axios.patch(`/api/incidentes/${closing.id}/`, payload);

      const bc = new BroadcastChannel('dashboard');
      bc.postMessage('invalidate');
      bc.close();

      setClosing(null);
      await fetchList();

      await success({
        title: 'Incidente cerrado',
        message:
          'Si este incidente generó costo, finalizá el alquiler para actualizar la garantía.',
      });
    } catch (e) {
      const m =
        e?.response?.data && typeof e.response.data === 'object'
          ? JSON.stringify(e.response.data)
          : 'No se pudo cerrar el incidente.';
      await error({ title: 'Error al cerrar', message: m });
    }
  };

  // ---- Acciones: eliminar ----
  const eliminarIncidente = async (row) => {
    if (row.estado_incidente !== 'resuelto') {
      await error({
        title: 'Acción bloqueada',
        message: 'Solo se pueden eliminar incidentes resueltos.',
      });
      return;
    }

    const ok = await confirm({
      title: `Eliminar incidente #${row.id}`,
      message: 'Esta acción no se puede deshacer. ¿Deseás continuar?',
      okText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/incidentes/${row.id}/`);

      const bc = new BroadcastChannel('dashboard');
      bc.postMessage('invalidate');
      bc.close();

      await fetchList();
      await success({ title: `Incidente #${row.id} eliminado` });
    } catch (e) {
      const m = e?.response?.data?.detail || 'No se pudo eliminar el incidente.';
      await error({ title: 'Error al eliminar', message: m });
    }
  };

  return (
    <Layout>
      <div className="card">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3
              style={{
                margin: '0 0 6px 0',
                fontSize: 20,
                fontWeight: 700,
                color: '#111',
              }}
            >
              Incidentes
            </h3>
            <p className="muted">Gestión de problemas con productos</p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Buscador */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#fffdf2',
                borderRadius: 12,
                padding: '8px 14px',
                border: '1px solid #e2d18a',
                minWidth: 260,
              }}
            >
              <Search size={16} style={{ color: '#B0B0B0' }} />
              <input
                placeholder="Buscar por producto, estado o descripción…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  paddingLeft: 8,
                  width: '100%',
                }}
              />
            </div>

            {/* Botón nuevo incidente */}
            <Link
              to="/incidentes/nuevo"
              className="btn"
              style={{
                background: '#ffd700',
                color: '#111',
                border: '1px solid #d6b73f',
                padding: '8px 16px',
                borderRadius: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={16} /> Registrar incidente
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF5E1 100%)',
            borderRadius: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            border: '1px solid #FFE4A3',
          }}
        >
          {/* Más recientes */}
          <button
            onClick={() => {
              setFiltroRecientes(!filtroRecientes);
              if (!filtroRecientes) {
                setFilterStatus('');
              }
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border: filtroRecientes
                ? '2px solid #DEB887'
                : '1px solid #FFE4A3',
              background: filtroRecientes
                ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                : '#FFF9E6',
              color: filtroRecientes ? '#8B4513' : '#C77C2A',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow: filtroRecientes
                ? '0 4px 12px rgba(222,184,135,0.25)'
                : 'none',
            }}
          >
            <TrendingUp size={16} />
            Más recientes
          </button>

          <div
            style={{ width: '1px', background: '#FFE4A3', margin: '0 4px' }}
          />

          {/* Todos */}
          <button
            onClick={() => setFilterStatus('')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === ''
                  ? '2px solid #DEB887'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === ''
                  ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                  : '#FFFFFF',
              color: filterStatus === '' ? '#8B4513' : '#A0522D',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow:
                filterStatus === ''
                  ? '0 4px 12px rgba(222,184,135,0.25)'
                  : 'none',
            }}
          >
            <AlertTriangle size={16} />
            Todos ({stats.total})
          </button>

          {/* Abiertos */}
          <button
            onClick={() => setFilterStatus('abiertos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'abiertos'
                  ? '2px solid #DEB887'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'abiertos'
                  ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                  : '#FFFFFF',
              color: filterStatus === 'abiertos' ? '#8B4513' : '#A0522D',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow:
                filterStatus === 'abiertos'
                  ? '0 4px 12px rgba(222,184,135,0.25)'
                  : 'none',
            }}
          >
            <AlertTriangle size={16} />
            Abiertos ({stats.abiertos})
          </button>

          {/* Resueltos */}
          <button
            onClick={() => setFilterStatus('resueltos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'resueltos'
                  ? '2px solid #DEB887'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'resueltos'
                  ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                  : '#FFFFFF',
              color: filterStatus === 'resueltos' ? '#8B4513' : '#A0522D',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow:
                filterStatus === 'resueltos'
                  ? '0 4px 12px rgba(222,184,135,0.25)'
                  : 'none',
            }}
          >
            <CheckCircle size={16} />
            Resueltos ({stats.resueltos})
          </button>

          {(filterStatus || filtroRecientes) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFiltroRecientes(false);
                setMostrarLista(false);
                setQ('');
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 24,
                border: '2px solid #fecaca',
                background: '#fff',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginLeft: 'auto',
                transition: 'all 0.25s ease',
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contenido */}
        <div>
          {loading && (
            <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
              Cargando…
            </p>
          )}

          {!loading && err && (
            <p
              className="muted"
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#E53935',
              }}
            >
              {err}
            </p>
          )}

          {/* Mensaje sin filtros (privacidad) */}
          {!loading && !mostrarLista && !err && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#fafafa',
                borderRadius: 12,
                border: '2px dashed #e8a34d',
              }}
            >
              <FilterIcon
                size={48}
                color="#e8a34d"
                style={{ marginBottom: 16 }}
              />
              <h3
                style={{
                  color: '#c77c2a',
                  marginBottom: 8,
                  fontSize: 20,
                }}
              >
                Usa los filtros o el buscador para ver incidentes
              </h3>
              <p style={{ color: '#757575', fontSize: 14, marginBottom: 20 }}>
                Seleccioná "Más recientes" o filtrá por estado para comenzar
              </p>
              <button
                onClick={() => setFiltroRecientes(true)}
                style={{
                  background: '#fff9e6',
                  color: '#c77c2a',
                  border: '2px solid #e8a34d',
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
                Ver incidentes más recientes
              </button>
            </div>
          )}

          {!loading && mostrarLista && filtered.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
              No se encontraron incidentes con los filtros aplicados.
            </p>
          )}

          {/* Tarjetas */}
          <div style={{ display: 'grid', gap: 16 }}>
            {!loading &&
              mostrarLista &&
              filtered.length > 0 &&
              paginatedData.map((r) => {
                const isAbierto = r.estado_incidente === 'abierto';
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
                      e.currentTarget.style.boxShadow =
                        '0 8px 24px rgba(255,179,0,0.3)';
                      e.currentTarget.style.borderColor = '#FFB300';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow =
                        '0 2px 8px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = '#E0E0E0';
                    }}
                  >
                    {/* Header tarjeta */}
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, #FFE9E9 0%, #FFE1D6 100%)',
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <AlertTriangle size={18} color="#D84315" />
                          <h4
                            style={{
                              margin: 0,
                              fontSize: 20,
                              fontWeight: 700,
                              color: '#5D4037',
                            }}
                          >
                            Incidente #{r.id}
                          </h4>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 4,
                            color: '#6D4C41',
                            fontSize: 14,
                          }}
                        >
                          <Package size={14} />
                          <span>{r.producto_nombre || '—'}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            background: isAbierto ? '#FFB300' : '#4CAF50',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#fff',
                            marginBottom: 4,
                          }}
                        >
                          {isAbierto ? 'ABIERTO' : 'RESUELTO'}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#6D4C41',
                            textTransform: 'capitalize',
                          }}
                        >
                          {r.tipo_incidente || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div style={{ padding: 20 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(180px, 1fr))',
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
                            }}
                          >
                            Cantidad afectada
                          </div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: '#D84315',
                            }}
                          >
                            {r.cantidad_afectada}
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
                            Resultado
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#212121',
                              textTransform: 'capitalize',
                            }}
                          >
                            {r.resultado_final || 'sin_accion'}
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
                            Fecha
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#212121',
                            }}
                          >
                            {formatDate(r.fecha_incidente)}
                          </div>
                        </div>
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
                          style={{
                            background: '#FAFAFA',
                            border: '1px solid #E0E0E0',
                            color: '#212121',
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
                          onClick={() => openDetails(r)}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget;
                            btn.style.background = '#E3F2FD';
                            btn.style.borderColor = '#2196F3';
                            btn.style.color = '#1976D2';
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget;
                            btn.style.background = '#FAFAFA';
                            btn.style.borderColor = '#E0E0E0';
                            btn.style.color = '#212121';
                          }}
                        >
                          <Eye size={13} /> Ver detalles
                        </button>

                        {isAbierto && (
                          <button
                            style={{
                              background: '#E8F5E9',
                              border: '1px solid #A5D6A7',
                              color: '#2E7D32',
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
                            onClick={() => openCloseModal(r)}
                            onMouseEnter={(e) => {
                              const btn = e.currentTarget;
                              btn.style.background =
                                'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)';
                              btn.style.borderColor = '#66BB6A';
                              btn.style.color = '#1B5E20';
                            }}
                            onMouseLeave={(e) => {
                              const btn = e.currentTarget;
                              btn.style.background = '#E8F5E9';
                              btn.style.borderColor = '#A5D6A7';
                              btn.style.color = '#2E7D32';
                            }}
                          >
                            Cerrar incidente
                          </button>
                        )}

                        {!isAbierto && (
                          <button
                            style={{
                              background: '#FAFAFA',
                              border: '1px solid #E0E0E0',
                              color: '#E53935',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s',
                              marginLeft: 'auto',
                            }}
                            onClick={() => eliminarIncidente(r)}
                            onMouseEnter={(e) => {
                              const btn = e.currentTarget;
                              btn.style.background = '#E53935';
                              btn.style.borderColor = '#E53935';
                              btn.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              const btn = e.currentTarget;
                              btn.style.background = '#FAFAFA';
                              btn.style.borderColor = '#E0E0E0';
                              btn.style.color = '#E53935';
                            }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Paginación */}
          {!loading && mostrarLista && filtered.length > 0 && totalPages > 1 && (
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
                <li>
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    aria-label="Primera"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #FFE4A3',
                      background: currentPage === 1 ? '#FFFBF0' : '#FFFFFF',
                      color: currentPage === 1 ? '#BDBDBD' : '#A0522D',
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

                <li>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Anterior"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #FFE4A3',
                      background: currentPage === 1 ? '#FFFBF0' : '#FFFFFF',
                      color: currentPage === 1 ? '#BDBDBD' : '#A0522D',
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

                {getPageNumbers().map((page, index) =>
                  page === '...' ? (
                    <li key={`ellipsis-${index}`}>
                      <span
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #FFE4A3',
                          background: '#FFFFFF',
                          color: '#9E9E0E',
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
                          border: '1px solid #FFE4A3',
                          background:
                            currentPage === page
                              ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)'
                              : '#FFFFFF',
                          color:
                            currentPage === page ? '#5D4037' : '#A0522D',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight:
                            currentPage === page ? '700' : '600',
                          boxShadow:
                            currentPage === page
                              ? '0 2px 4px rgba(222,184,135,0.2)'
                              : 'none',
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
                      padding: '8px 12px',
                      border: '1px solid #FFE4A3',
                      background:
                        currentPage === totalPages ? '#FFFBF0' : '#FFFFFF',
                      color:
                        currentPage === totalPages ? '#BDBDBD' : '#A0522D',
                      cursor:
                        currentPage === totalPages ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px',
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
                      padding: '8px 12px',
                      border: '1px solid #FFE4A3',
                      background:
                        currentPage === totalPages ? '#FFFBF0' : '#FFFFFF',
                      color:
                        currentPage === totalPages ? '#BDBDBD' : '#A0522D',
                      cursor:
                        currentPage === totalPages ? 'not-allowed' : 'pointer',
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
        </div>
      </div>

      {/* MODAL DETALLES (estilo Employees) */}
      {detailsOpen && details && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
            }}
            onClick={() => setDetailsOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              padding: 0,
              borderRadius: 16,
              maxWidth: 720,
              width: '90%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1000,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header modal */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, #FFE9E9 0%, #FFE1D6 100%)',
                padding: '24px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: '#5D4037',
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  Incidente #{details.id}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    color: '#8B4513',
                    fontSize: 14,
                  }}
                >
                  Detalle del incidente
                </p>
              </div>
            </div>

            {/* Contenido modal */}
            <div
              style={{
                padding: 28,
                flex: 1,
                overflowY: 'auto',
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
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#757575',
                      marginBottom: 4,
                    }}
                  >
                    Producto
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {details.producto_nombre || '—'}
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
                    <div
                      style={{
                        fontSize: 13,
                        color: '#757575',
                        marginBottom: 4,
                      }}
                    >
                      Tipo
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {details.tipo_incidente || '—'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#757575',
                        marginBottom: 4,
                      }}
                    >
                      Estado
                    </div>
                    <span
                      style={{
                        background:
                          details.estado_incidente === 'abierto'
                            ? '#FFB300'
                            : '#4CAF50',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 700,
                        display: 'inline-block',
                      }}
                    >
                      {(details.estado_incidente || '').toUpperCase() || '—'}
                    </span>
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
                    <div
                      style={{
                        fontSize: 13,
                        color: '#757575',
                        marginBottom: 4,
                      }}
                    >
                      Cantidad afectada
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {details.cantidad_afectada}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#757575',
                        marginBottom: 4,
                      }}
                    >
                      Cantidad repuesta
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {details.cantidad_repuesta || '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#757575',
                      marginBottom: 4,
                    }}
                  >
                    Resultado
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {details.resultado_final || 'sin_accion'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#757575',
                      marginBottom: 4,
                    }}
                  >
                    Descripción
                  </div>
                  <div style={{ fontSize: 15 }}>
                    {details.descripcion || '—'}
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
                    <div
                      style={{
                        fontSize: 13,
                        color: '#757575',
                        marginBottom: 4,
                      }}
                    >
                      Fecha del incidente
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {formatDate(details.fecha_incidente, true)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#757575',
                        marginBottom: 4,
                      }}
                    >
                      Fecha de resolución
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {formatDate(details.fecha_resolucion, true)}
                    </div>
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
                background: '#FFF7E6',
              }}
            >
              <button
                onClick={() => setDetailsOpen(false)}
                style={{
                  background:
                    'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                  color: '#5D4037',
                  border: '1px solid #FFE4A3',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = 'scale(1.05)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL CIERRE INCIDENTE */}
      {closing && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(3px)',
              zIndex: 999,
            }}
            onClick={() => setClosing(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 520,
              width: '90%',
              padding: 24,
              zIndex: 1000,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 20,
                fontWeight: 700,
                color: '#5D4037',
              }}
            >
              Cerrar incidente #{closing.id}
            </h3>
            <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
              Elegí el resultado final. Si es <b>"repuesto"</b>, indicá la
              cantidad (si la dejás vacía se tomará la cantidad afectada).
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <label className="underline-field">
                <small className="muted">Resultado</small>
                <select
                  value={closeResult}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCloseResult(v);
                    if (v !== 'repuesto') setCantidadRep('');
                  }}
                  className="select-clean"
                  style={{
                    width: '100%',
                    padding: '8px 4px',
                    border: 'none',
                    borderBottom: '1px solid #E0E0E0',
                    outline: 'none',
                  }}
                >
                  {closing.tipo_incidente !== 'irreparable' && (
                    <option value="reintegrado">
                      Reintegrado al stock (reparado)
                    </option>
                  )}
                  <option value="repuesto">Repuesto por compra</option>
                  <option value="sin_accion">Sin acción (no vuelve)</option>
                </select>
              </label>

              {closeResult === 'repuesto' && (
                <label className="underline-field">
                  <small className="muted">
                    Cantidad repuesta (máx. {closing.cantidad_afectada})
                  </small>
                  <input
                    type="number"
                    min="1"
                    max={Number(closing.cantidad_afectada || 0)}
                    value={cantidadRep}
                    onChange={(e) => setCantidadRep(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 4px',
                      border: 'none',
                      borderBottom: '1px solid #E0E0E0',
                      outline: 'none',
                    }}
                  />
                </label>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                onClick={() => setClosing(null)}
                style={{
                  background: '#FAFAFA',
                  color: '#424242',
                  border: '1px solid #E0E0E0',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={doClose}
                style={{
                  background:
                    'linear-gradient(135deg, #C8E6C9 0%, #81C784 100%)',
                  color: '#1B5E20',
                  border: '1px solid #66BB6A',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirmar cierre
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}


