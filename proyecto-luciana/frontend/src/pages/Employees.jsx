// src/pages/Employees.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Filter as FilterIcon,
} from 'lucide-react';

import { confirm, success, error } from './alerts';

const ITEMS_PER_PAGE = 5;

export default function Employees() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtros
  const [filterStatus, setFilterStatus] = useState(''); // '', activos, inactivos
  const [mostrarLista, setMostrarLista] = useState(false);
  const [filtroRecientes, setFiltroRecientes] = useState(false);

  const [toast, setToast] = useState(null);
  const pushToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2400);
  };

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (location.state?.created) {
      pushToast(
        'success',
        `Usuario creado${
          location.state.username ? `: ${location.state.username}` : ''
        }.`
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/gestion-empleados/');
      setRows(Array.isArray(data) ? data : data.results || []);
      setErr('');
    } catch {
      setErr('No se pudo cargar el listado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchList();
    }
  }, [isAdmin]);

  // Cuando busca o filtra mostramos la lista
  useEffect(() => {
    if (q.trim() || filterStatus || filtroRecientes) {
      setMostrarLista(true);
    }
  }, [q, filterStatus, filtroRecientes]);

  // Filtro "más recientes"
  const recientesFiltrados = useMemo(() => {
    if (!filtroRecientes) return rows;
    return [...rows].sort((a, b) => b.id - a.id).slice(0, 15);
  }, [rows, filtroRecientes]);

  // Filtros y búsqueda
  const filtered = useMemo(() => {
    let result = filtroRecientes ? recientesFiltrados : rows;

    if (filterStatus === 'activos') {
      result = result.filter((r) => r.activo);
    } else if (filterStatus === 'inactivos') {
      result = result.filter((r) => !r.activo);
    }

    const term = q.trim().toLowerCase();
    if (term) {
      result = result.filter((r) =>
        [r.nombre, r.apellido, r.dni, r.telefono, r.rol_display]
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
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Estadísticas
  const stats = useMemo(() => {
    const total = rows.length;
    const activos = rows.filter((r) => r.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [rows]);

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar empleado',
      message: 'Esta acción no se puede deshacer. ¿Deseás continuar?',
      okText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/gestion-empleados/${id}/`);
      await success({ title: 'Empleado eliminado' });
      await fetchList();

      const bc = new BroadcastChannel('dashboard');
      bc.postMessage('invalidate');
      bc.close();
    } catch {
      await error({ title: 'No se pudo eliminar' });
    }
  };

  const openDetails = async (id) => {
    try {
      const { data } = await axios.get(`/api/gestion-empleados/${id}/`);
      setDetails(data);
      setDetailsOpen(true);
    } catch {
      await error({ title: 'No se pudo obtener el detalle' });
    }
  };

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

  // Colores de badge por rol
  const getRolBadgeColor = (rol) => {
    const colors = {
      administrador: { bg: '#FFF3E0', text: '#E65100', border: '#FFB74D' },
      chofer: { bg: '#FFF8E1', text: '#F57F17', border: '#FFD54F' },
      operario_carga: { bg: '#FFECB3', text: '#FF6F00', border: '#FFB74D' },
      encargado: { bg: '#FFE0B2', text: '#E65100', border: '#FF9800' },
      personal_limpieza: { bg: '#FFF9C4', text: '#F57F17', border: '#FDD835' },
      operaria_lavanderia: { bg: '#FFECB3', text: '#FF8F00', border: '#FFCA28' },
      cajero: { bg: '#FFE082', text: '#F57C00', border: '#FFB300' },
      empleado: { bg: '#FFF8E1', text: '#F9A825', border: '#FFD54F' },
    };
    return colors[rol] || { bg: '#F5F5F5', text: '#616161', border: '#E0E0E0' };
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">
            Solo los administradores pueden ver y gestionar empleados.
          </p>
        </div>
      </Layout>
    );
  }

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
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        {/* Header - mismo espacio que Products */}
        <div
          className="emp-header"
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
              Empleados
            </h3>
            <p className="muted">Gestión del personal de la empresa</p>
          </div>

          <div
            className="emp-actions"
            style={{ display: 'flex', gap: 12, alignItems: 'center' }}
          >
            {/* Buscador estilo Products */}
            <div
              className="emp-search"
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
                placeholder="Buscar por nombre, DNI, rol…"
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

            {/* Botón igual al de Products */}
            <Link
              to="/empleados/nuevo"
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
              <Plus size={16} /> Agregar empleado
            </Link>
          </div>
        </div>

        {/* Filtros + más recientes (mismo contenedor que Products) */}
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
            <Users size={16} />
            Todos ({stats.total})
          </button>

          <button
            onClick={() => setFilterStatus('activos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'activos'
                  ? '2px solid #DEB887'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'activos'
                  ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                  : '#FFFFFF',
              color: filterStatus === 'activos' ? '#8B4513' : '#A0522D',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow:
                filterStatus === 'activos'
                  ? '0 4px 12px rgba(222,184,135,0.25)'
                  : 'none',
            }}
          >
            <UserCheck size={16} />
            Activos ({stats.activos})
          </button>

          <button
            onClick={() => setFilterStatus('inactivos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'inactivos'
                  ? '2px solid #DEB887'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'inactivos'
                  ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                  : '#FFFFFF',
              color: filterStatus === 'inactivos' ? '#8B4513' : '#A0522D',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow:
                filterStatus === 'inactivos'
                  ? '0 4px 12px rgba(222,184,135,0.25)'
                  : 'none',
            }}
          >
            <UserX size={16} />
            Inactivos ({stats.inactivos})
          </button>

          {(filterStatus || filtroRecientes) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFiltroRecientes(false);
                setMostrarLista(false);
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

          {/* Mensaje sin filtros: mismo estilo que Products */}
          {!loading && !mostrarLista && (
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
                Usa los filtros o el buscador para ver empleados
              </h3>
              <p style={{ color: '#757575', fontSize: 14, marginBottom: 20 }}>
                Selecciona "Más recientes" o filtra por estado para comenzar
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
                Ver empleados más recientes
              </button>
            </div>
          )}

          {!loading && mostrarLista && filtered.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
              No se encontraron empleados con los filtros aplicados.
            </p>
          )}

          {/* Tarjetas */}
          <div style={{ display: 'grid', gap: 16 }}>
            {!loading &&
              mostrarLista &&
              filtered.length > 0 &&
              paginatedData.map((r) => {
                const rolColors = getRolBadgeColor(r.rol);

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
                          'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
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
                            color: '#5D4037',
                          }}
                        >
                          {r.nombre} {r.apellido}
                        </h4>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          <span
                            style={{
                              background: rolColors.bg,
                              color: rolColors.text,
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              border: `1px solid ${rolColors.border}`,
                            }}
                          >
                            {r.rol_display || '—'}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            background: r.activo ? '#4CAF50' : '#E53935',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {r.activo ? 'ACTIVO' : 'INACTIVO'}
                        </div>
                      </div>
                    </div>

                    {/* Contenido reducido: SOLO fecha de ingreso */}
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
                            Fecha de ingreso
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#212121',
                            }}
                          >
                            {r.fecha_ingreso || '—'}
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
                          onClick={() => openDetails(r.id)}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#E3F2FD';
                            e.target.style.borderColor = '#2196F3';
                            e.target.style.color = '#1976D2';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#FAFAFA';
                            e.target.style.borderColor = '#E0E0E0';
                            e.target.style.color = '#212121';
                          }}
                        >
                          <Eye size={13} /> Ver
                        </button>
                        <button
                          style={{
                            background: '#FFFBF0',
                            border: '1px solid #FFE4A3',
                            color: '#8B4513',
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
                          onClick={() => navigate(`/empleados/${r.id}/editar`)}
                          onMouseEnter={(e) => {
                            e.target.style.background =
                              'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)';
                            e.target.style.borderColor = '#DEB887';
                            e.target.style.color = '#5D4037';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#FFFBF0';
                            e.target.style.borderColor = '#FFE4A3';
                            e.target.style.color = '#8B4513';
                          }}
                        >
                          <Pencil size={13} /> Editar
                        </button>
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
                          onClick={() => onDelete(r.id)}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#E53935';
                            e.target.style.borderColor = '#E53935';
                            e.target.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#FAFAFA';
                            e.target.style.borderColor = '#E0E0E0';
                            e.target.style.color = '#E53935';
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

      {/* Modal detalles */}
      {detailsOpen && details && (
        <>
          {/* overlay */}
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
          {/* modal card */}
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
                  'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
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
                  {details.nombre} {details.apellido}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    color: '#8B4513',
                    fontSize: 14,
                  }}
                >
                  Detalle del empleado
                </p>
              </div>
            </div>

            {/* Contenido modal (scroll) */}
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
                    Usuario
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {details.usuario?.username || '—'}
                    <span
                      style={{
                        color: '#757575',
                        fontWeight: 400,
                        marginLeft: 8,
                      }}
                    >
                      ({details.usuario?.email || 'sin email'})
                    </span>
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
                    Rol
                  </div>
                  <span
                    style={{
                      background:
                        'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                      color: '#5D4037',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'inline-block',
                      border: '1px solid #FFE4A3',
                    }}
                  >
                    {details.rol_display || details.rol || '—'}
                  </span>
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
                      DNI
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {details.dni || '—'}
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
                      Teléfono
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {details.telefono || '—'}
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
                    Dirección
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {details.direccion || '—'}
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
                      Fecha de Ingreso
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {details.fecha_ingreso || '—'}
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
                      Fecha de Egreso
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {details.fecha_egreso || '—'}
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
                    Estado
                  </div>
                  <span
                    style={{
                      background: details.activo ? '#4CAF50' : '#E53935',
                      color: '#fff',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      display: 'inline-block',
                    }}
                  >
                    {details.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer modal (siempre visible) */}
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
    </Layout>
  );
}






