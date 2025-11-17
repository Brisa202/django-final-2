// src/pages/Clients.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Eye,
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  TrendingUp,
  User,
  Phone,
  MapPin,
  Mail,
  Filter,   // nuevo icono para el mensaje vacío
} from 'lucide-react';
import { confirm, success, error } from './alerts';

const ITEMS_PER_PAGE = 5;

export default function Clients() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos'); // todos | activos | inactivos
  const [sortRecent, setSortRecent] = useState(false);

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/clientes/');
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const filtered = useMemo(() => {
    let result = rows;

    // Filtro por estado
    if (filterStatus === 'activos') {
      result = result.filter((r) => r.activo);
    } else if (filterStatus === 'inactivos') {
      result = result.filter((r) => !r.activo);
    }

    // Filtro por búsqueda
    const t = q.trim().toLowerCase();
    if (t) {
      result = result.filter((r) =>
        [r.nombre, r.apellido, r.telefono]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t))
      );
    }

    // Ordenar por más recientes
    if (sortRecent) {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.created_at || a.id);
        const dateB = new Date(b.created_at || b.id);
        return dateB - dateA;
      });
    }

    return result;
  }, [rows, q, filterStatus, sortRecent]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIdx, endIdx);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, filterStatus, sortRecent]);

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: 'Esta acción no se puede deshacer. ¿Deseás continuar?',
      okText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await axios.delete(`/api/clientes/${id}/`);
      await success({ title: 'Cliente eliminado' });
      fetchList();

      const bc = new BroadcastChannel('dashboard');
      bc.postMessage('invalidate');
      bc.close();
    } catch {
      await error({ title: 'No se pudo eliminar el cliente' });
    }
  };

  const openDetails = async (id) => {
    try {
      const { data } = await axios.get(`/api/clientes/${id}/`);
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
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }

    return pages;
  };

  const stats = useMemo(() => {
    const activos = rows.filter((r) => r.activo).length;
    const inactivos = rows.filter((r) => !r.activo).length;
    return { total: rows.length, activos, inactivos };
  }, [rows]);

  const hasFilters = q || filterStatus !== 'todos' || sortRecent;
  const showData = filtered.length > 0 && hasFilters;

  const clearFilters = () => {
    setQ('');
    setFilterStatus('todos');
    setSortRecent(false);
  };

  return (
    <Layout>
      <div className="card">
        {/* HEADER, igual a Products */}
        <div
          className="clients-header"
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
              Clientes
            </h3>
            <p className="muted">Gestión de clientes de la empresa</p>
          </div>

          <div
            className="clients-actions"
            style={{ display: 'flex', gap: 12, alignItems: 'center' }}
          >
            {/* Buscador estilo Products */}
            <div
              className="clients-search"
              style={{
                position: 'relative',
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
                placeholder="Buscar por nombre, teléfono..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  paddingLeft: 8,
                  width: '100%',
                  color: '#111',
                }}
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  title="Limpiar búsqueda"
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#757575',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isAdmin && (
              <Link
                to="/clientes/nuevo"
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
                <Plus size={16} /> Agregar cliente
              </Link>
            )}
          </div>
        </div>

        {/* BLOQUE DE FILTROS, mismo contenedor que Products/Employees */}
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
              setSortRecent(!sortRecent);
              if (!sortRecent) setFilterStatus('todos');
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border: sortRecent ? '2px solid #DEB887' : '1px solid #FFE4A3',
              background: sortRecent
                ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                : '#FFF9E6',
              color: sortRecent ? '#8B4513' : '#C77C2A',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow: sortRecent
                ? '0 4px 12px rgba(222,184,135,0.25)'
                : 'none',
            }}
          >
            <TrendingUp size={16} />
            Más recientes
          </button>

          <div
            style={{ width: 1, alignSelf: 'stretch', background: '#FFE4A3' }}
          />

          {/* Todos */}
          <button
            onClick={() => setFilterStatus('todos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'todos'
                  ? '2px solid #DEB887'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'todos'
                  ? 'linear-gradient(135deg, #FFF4D6 0%, #FFE8B3 100%)'
                  : '#FFFFFF',
              color: filterStatus === 'todos' ? '#8B4513' : '#A0522D',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow:
                filterStatus === 'todos'
                  ? '0 4px 12px rgba(222,184,135,0.25)'
                  : 'none',
            }}
          >
            <User size={16} />
            Todos ({stats.total})
          </button>

          {/* Activos */}
          <button
            onClick={() => setFilterStatus('activos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'activos'
                  ? '2px solid #4CAF50'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'activos' ? '#E8F5E9' : '#FFFFFF',
              color: filterStatus === 'activos' ? '#2E7D32' : '#666',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            Activos ({stats.activos})
          </button>

          {/* Inactivos */}
          <button
            onClick={() => setFilterStatus('inactivos')}
            style={{
              padding: '10px 20px',
              borderRadius: 24,
              border:
                filterStatus === 'inactivos'
                  ? '2px solid #E53935'
                  : '1px solid #FFE4A3',
              background:
                filterStatus === 'inactivos' ? '#FFEBEE' : '#FFFFFF',
              color: filterStatus === 'inactivos' ? '#C62828' : '#666',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            Inactivos ({stats.inactivos})
          </button>

          {(filterStatus !== 'todos' || sortRecent) && (
            <button
              onClick={clearFilters}
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

        {/* CONTENIDO */}
        <div style={{ padding: '20px 0' }}>
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: '#FAFAFA',
                borderRadius: 12,
                border: '2px dashed #E0E0E0',
              }}
            >
              <p className="muted" style={{ fontSize: 16 }}>
                Cargando clientes...
              </p>
            </div>
          )}

          {/* Mensaje inicial SIN filtros: igual a Products/Employees */}
          {!loading && !hasFilters && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#fafafa',
                borderRadius: 12,
                border: '2px dashed #e8a34d',
              }}
            >
              <Filter size={48} color="#e8a34d" style={{ marginBottom: 16 }} />
              <h3
                style={{
                  color: '#c77c2a',
                  marginBottom: 8,
                  fontSize: 20,
                }}
              >
                Usa los filtros o el buscador para ver clientes
              </h3>
              <p
                style={{
                  color: '#757575',
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
                Ver clientes más recientes
              </button>
            </div>
          )}

          {/* Sin resultados con filtros */}
          {!loading && hasFilters && filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF4D6 100%)',
                borderRadius: 12,
                border: '2px dashed #FFE4A3',
              }}
            >
              <User size={48} style={{ color: '#DEB887', marginBottom: 16 }} />
              <p
                className="muted"
                style={{ fontSize: 16, color: '#8B4513' }}
              >
                No se encontraron clientes con los filtros aplicados
              </p>
            </div>
          )}

          {/* LISTA DE TARJETAS */}
          <div style={{ display: 'grid', gap: 16 }}>
            {!loading &&
              showData &&
              currentItems.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background:
                      'linear-gradient(135deg, #FFFBF0 0%, #FFF4D6 100%)',
                    border: '1px solid #FFE4A3',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(222, 184, 135, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 8px 24px rgba(222, 184, 135, 0.4)';
                    e.currentTarget.style.borderColor = '#DEB887';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow =
                      '0 2px 8px rgba(222, 184, 135, 0.2)';
                    e.currentTarget.style.borderColor = '#FFE4A3';
                  }}
                >
                  {/* Header tarjeta */}
                  <div
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #FFE4A3',
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
                        {c.nombre} {c.apellido}
                      </h4>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#8B4513',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <User size={14} />
                        Cliente
                      </div>
                    </div>
                    <div
                      style={{
                        background: c.activo ? '#4CAF50' : '#E53935',
                        padding: '6px 16px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {c.activo ? 'ACTIVO' : 'INACTIVO'}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={{ padding: '20px 24px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#8B4513',
                            marginBottom: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                          }}
                        >
                          <Phone size={12} />
                          Teléfono
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: '#5D4037',
                          }}
                        >
                          {c.telefono || '—'}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#8B4513',
                            marginBottom: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                          }}
                        >
                          <MapPin size={12} />
                          Dirección
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: '#5D4037',
                          }}
                        >
                          {c.direccion ? c.direccion.split(',')[0] : '—'}
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
                        borderTop: '1px solid #FFE4A3',
                      }}
                    >
                      <button
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #DEB887',
                          color: '#8B4513',
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                        }}
                        onClick={() => openDetails(c.id)}
                        onMouseEnter={(e) => {
                          e.target.style.background =
                            'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)';
                          e.target.style.borderColor = '#DEB887';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#FFFFFF';
                          e.target.style.borderColor = '#DEB887';
                        }}
                      >
                        <Eye size={13} /> Ver
                      </button>

                      {isAdmin && (
                        <button
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #DEB887',
                            color: '#8B4513',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                          }}
                          onClick={() => navigate(`/clientes/${c.id}/editar`)}
                          onMouseEnter={(e) => {
                            e.target.style.background =
                              'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)';
                            e.target.style.borderColor = '#DEB887';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#FFFFFF';
                            e.target.style.borderColor = '#DEB887';
                          }}
                        >
                          <Pencil size={13} /> Editar
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E0E0E0',
                            color: '#E53935',
                            padding: '8px 16px',
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
                          onClick={() => onDelete(c.id)}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#E53935';
                            e.target.style.borderColor = '#E53935';
                            e.target.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#FFFFFF';
                            e.target.style.borderColor = '#E0E0E0';
                            e.target.style.color = '#E53935';
                          }}
                        >
                          <Trash2 size={13} /> Borrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* PAGINACIÓN */}
          {!loading && showData && totalPages > 1 && (
            <nav aria-label="Navegación de páginas" style={{ marginTop: 24 }}>
              <ul
                style={{
                  display: 'flex',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  justifyContent: 'center',
                  gap: 4,
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
                      background:
                        currentPage === 1 ? '#FFFBF0' : '#FFFFFF',
                      color: currentPage === 1 ? '#BDBDBD' : '#A0522D',
                      cursor:
                        currentPage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 4,
                      fontSize: 14,
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
                      background:
                        currentPage === 1 ? '#FFFBF0' : '#FFFFFF',
                      color: currentPage === 1 ? '#BDBDBD' : '#A0522D',
                      cursor:
                        currentPage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 4,
                      fontSize: 14,
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
                          color: '#9E9E9E',
                          borderRadius: 4,
                          fontSize: 14,
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
                          borderRadius: 4,
                          fontSize: 14,
                          fontWeight:
                            currentPage === page ? 700 : 600,
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
                        currentPage === totalPages
                          ? '#FFFBF0'
                          : '#FFFFFF',
                      color:
                        currentPage === totalPages
                          ? '#BDBDBD'
                          : '#A0522D',
                      cursor:
                        currentPage === totalPages
                          ? 'not-allowed'
                          : 'pointer',
                      borderRadius: 4,
                      fontSize: 14,
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
                        currentPage === totalPages
                          ? '#FFFBF0'
                          : '#FFFFFF',
                      color:
                        currentPage === totalPages
                          ? '#BDBDBD'
                          : '#A0522D',
                      cursor:
                        currentPage === totalPages
                          ? 'not-allowed'
                          : 'pointer',
                      borderRadius: 4,
                      fontSize: 14,
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

      {/* MODAL DETALLES */}
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
              maxHeight: '85vh',
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
                  Información completa del cliente
                </p>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8B4513',
                  cursor: 'pointer',
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    'rgba(139,69,19,0.1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <X size={24} />
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
                  gap: 20,
                  background:
                    'linear-gradient(135deg, #FFFBF0 0%, #FFF9E6 100%)',
                  padding: 24,
                  borderRadius: 12,
                  border: '1px solid #FFE4A3',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Nombre
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#5D4037',
                      }}
                    >
                      {details.nombre || '—'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Apellido
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#5D4037',
                      }}
                    >
                      {details.apellido || '—'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Mail size={13} />
                      Email
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#5D4037',
                      }}
                    >
                      {details.email || '—'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Phone size={13} />
                      Teléfono
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#5D4037',
                      }}
                    >
                      {details.telefono || '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#8B4513',
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    Documento
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#5D4037',
                    }}
                  >
                    {details.documento || '—'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#8B4513',
                      marginBottom: 6,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <MapPin size={13} />
                    Dirección completa
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#5D4037',
                    }}
                  >
                    {details.direccion || '—'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Estado
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        background: details.activo ? '#4CAF50' : '#E53935',
                        padding: '6px 16px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        textTransform: 'uppercase',
                      }}
                    >
                      {details.activo ? 'ACTIVO' : 'INACTIVO'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Fecha de registro
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#5D4037',
                      }}
                    >
                      {details.created_at
                        ? new Date(details.created_at).toLocaleDateString(
                            'es-AR'
                          )
                        : '—'}
                    </div>
                  </div>
                </div>

                {details.notas && (
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#8B4513',
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Notas
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: '#5D4037',
                        background: '#FFFFFF',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #FFE4A3',
                      }}
                    >
                      {details.notas}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 24,
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setDetailsOpen(false)}
                  style={{
                    background:
                      'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                    border: '1px solid #DEB887',
                    color: '#5D4037',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background =
                      'linear-gradient(135deg, #FFE5B3 0%, #FFD699 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background =
                      'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)';
                  }}
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
