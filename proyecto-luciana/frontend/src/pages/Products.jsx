// src/pages/Products.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Pencil, Eye, ListOrdered, Power, TrendingUp, Filter } from 'lucide-react';
import { confirm, success, error } from './alerts';

export default function Products() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Filtro de categoría
  const [catFilter, setCatFilter] = useState('Todos');

  // Control de visibilidad y filtro recientes
  const [mostrarLista, setMostrarLista] = useState(false);
  const [filtroRecientes, setFiltroRecientes] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Detalles
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);

  // Modal de reservas
  const [resvOpen, setResvOpen] = useState(false);
  const [resvLoading, setResvLoading] = useState(false);
  const [resvErr, setResvErr] = useState('');
  const [resvRows, setResvRows] = useState([]);
  const [resvProd, setResvProd] = useState(null);

  // Colores más suaves y elegantes por categoría
  const categoryColors = {
    Vajilla: '#5b8cc9',      // azul suave
    Cristalería: '#4fb3d4',  // celeste medio
    Mantelería: '#e8a34d',   // dorado/naranja suave
    Decoración: '#d97ba6',   // rosa medio
    Salón: '#9f7aea',        // violeta medio
    Mobiliario: '#5ab572',   // verde medio
  };

  const getCategoryColor = (cat) => categoryColors[cat] || '#e8a34d';

  // Categorías fijas
  const categories = [
    'Todos',
    'Vajilla',
    'Cristalería',
    'Mantelería',
    'Decoración',
    'Salón',
    'Mobiliario',
  ];

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/productos/');
      setRows(Array.isArray(data) ? data : data.results || []);
      setErr('');
    } catch {
      setErr('No se pudo cargar el listado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Cuando el usuario busca, filtra o activa recientes, mostramos la lista
  useEffect(() => {
    if (q.trim() || catFilter !== 'Todos' || filtroRecientes) {
      setMostrarLista(true);
    }
  }, [q, catFilter, filtroRecientes]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let result = rows;

    // Filtro de recientes (últimos 20 productos)
    if (filtroRecientes) {
      result = [...rows].sort((a, b) => b.id - a.id).slice(0, 20);
    }

    if (t) {
      result = result.filter((r) =>
        [r.nombre, r.descripcion, r.categoria_display]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t))
      );
    }

    if (catFilter !== 'Todos') {
      result = result.filter((r) => r.categoria_display === catFilter);
    }

    return result;
  }, [rows, q, catFilter, filtroRecientes]);

  // Paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, catFilter, filtroRecientes]);

  const toggleActive = async (id, currentStatus) => {
    const action = currentStatus ? 'desactivar' : 'activar';
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} producto`,
      message: `¿Estás seguro de que querés ${action} este producto?`,
      okText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelText: 'Cancelar',
      tone: 'info',
    });
    if (!ok) return;
    doToggleActive(id, !currentStatus);
  };

  const doToggleActive = async (id, newStatus) => {
    try {
      await axios.patch(`/api/productos/${id}/`, { activo: newStatus });
      const bc = new BroadcastChannel('dashboard');
      bc.postMessage('invalidate');
      bc.close();
      await fetchList();
      await success({
        title: `Producto ${newStatus ? 'activado' : 'desactivado'}`,
        message: '',
      });
    } catch (e) {
      const server = e?.response?.data?.detail || e?.response?.data;
      const msg =
        typeof server === 'string' && server.length
          ? server
          : 'No se pudo cambiar el estado del producto.';
      await error({ title: 'Error', message: msg });
    }
  };

  const openDetails = async (id) => {
    try {
      const { data } = await axios.get(`/api/productos/${id}/`);
      setDetails(data);
      setDetailsOpen(true);
    } catch {
      await error({ title: 'Error', message: 'No se pudo obtener el detalle.' });
    }
  };

  const openReservas = async (prod) => {
    setResvProd({ id: prod.id, nombre: prod.nombre });
    setResvOpen(true);
    setResvLoading(true);
    setResvErr('');
    setResvRows([]);

    try {
      const { data } = await axios.get(`/api/productos/${prod.id}/reservas/`);
      const arr = Array.isArray(data) ? data : data.results || [];
      setResvRows(arr);
    } catch (e) {
      const server =
        e?.response?.data?.detail ||
        e?.message ||
        'No se pudo cargar el desglose de reservas.';
      setResvErr(
        typeof server === 'string'
          ? server
          : 'No se pudo cargar el desglose de reservas.'
      );
    } finally {
      setResvLoading(false);
    }
  };

  const totalReservado = (rowsArr) =>
    rowsArr.reduce((acc, r) => acc + Number(r.cantidad || 0), 0);

  const currency = (n) => `$${Number(n ?? 0).toLocaleString()}`;
  const disponible = (r) =>
    r?.stock_disponible ?? Math.max((r.stock || 0) - (r.stock_reservado || 0), 0);

  const ProductCard = ({ r }) => {
    const baseColor =
      catFilter === 'Todos'
        ? getCategoryColor(r.categoria_display)
        : getCategoryColor(catFilter);

    return (
      <div
        className={`product-card-horizontal ${
          r.activo ? 'card-active' : 'card-inactive'
        }`}
        style={{ background: baseColor }}
      >
        {/* Imagen */}
        <div className="product-image-container">
          {r.imagen_url ? (
            <img src={r.imagen_url} alt={r.nombre} className="product-img" />
          ) : (
            <div className="product-no-image">Sin imagen</div>
          )}
        </div>

        {/* Contenido */}
        <div className="product-content">
          <div className="product-header-row">
            <div>
              <h4 className="product-title">{r.nombre}</h4>
              <span className="product-cat">{r.categoria_display}</span>
            </div>
            <div className="product-price">{currency(r.precio)}</div>
          </div>

          <div className="product-stats-row">
            <div className="stat-item">
              <span className="stat-label">Stock</span>
              <span className="stat-val">{r.stock}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Disponible</span>
              <span className="stat-val">{disponible(r)}</span>
            </div>
            {Number(r.stock_reservado) > 0 && (
              <div className="stat-item">
                <span className="stat-label">Reservado</span>
                <span
                  className="stat-val clickable"
                  onClick={() => openReservas(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {r.stock_reservado}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="product-actions-col">
          <button className="action-btn" onClick={() => openDetails(r.id)}>
            <Eye size={16} /> Ver
          </button>
          {Number(r.stock_reservado) > 0 && (
            <button className="action-btn" onClick={() => openReservas(r)}>
              <ListOrdered size={16} /> Reservas
            </button>
          )}
          {isAdmin && (
            <>
              <button
                className="action-btn"
                onClick={() => navigate(`/productos/${r.id}/editar`)}
              >
                <Pencil size={16} /> Editar
              </button>
              <button
                className={`action-btn ${
                  r.activo ? 'btn-deactivate' : 'btn-activate'
                }`}
                onClick={() => toggleActive(r.id, r.activo)}
              >
                <Power size={16} /> {r.activo ? 'Desactivar' : 'Activar'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="card">
        {/* Encabezado */}
        <div className="products-header">
          <div className="products-info">
            <h3>Productos</h3>
            <p className="muted">Gestiona el catálogo de productos disponibles para alquiler</p>
          </div>

          <div className="products-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Buscar productos..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar productos"
              />
            </div>

            {isAdmin && (
              <Link to="/productos/nuevo" className="btn btn-gold">
                <Plus size={16} /> Agregar producto
              </Link>
            )}
          </div>
        </div>

        {/* Contenedor de filtros con fondo */}
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
          {/* Botón Más recientes */}
          <button
            className={`filter-chip recientes-chip ${filtroRecientes ? 'active' : ''}`}
            onClick={() => {
              setFiltroRecientes(!filtroRecientes);
              if (!filtroRecientes) {
                setCatFilter('Todos');
              }
            }}
          >
            <TrendingUp size={16} />
            Más Recientes
          </button>

          {categories.map((cat) => {
            if (cat === 'Todos') return null;
            const isActive = catFilter === cat;
            const baseColor = getCategoryColor(cat);

            return (
              <button
                key={cat}
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCatFilter(cat);
                  setFiltroRecientes(false);
                }}
                style={{
                  '--chip-color': baseColor,
                }}
              >
                {cat}
              </button>
            );
          })}

          {(catFilter !== 'Todos' || filtroRecientes) && (
            <button
              className="clear-filters-btn"
              onClick={() => {
                setCatFilter('Todos');
                setFiltroRecientes(false);
                setMostrarLista(false);
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contenido */}
        {loading && (
          <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
            Cargando productos…
          </div>
        )}

        {!loading && err && (
          <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
            {err}
          </div>
        )}

        {/* Mensaje de privacidad cuando no hay filtros */}
        {!loading && !err && !mostrarLista && (
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
            <h3 style={{ color: '#c77c2a', marginBottom: 8, fontSize: 20 }}>
              Usa los filtros o el buscador para ver productos
            </h3>
            <p style={{ color: '#757575', fontSize: 14, marginBottom: 20 }}>
              Selecciona "Más recientes" o filtra por categoría para comenzar
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
              Ver productos más recientes
            </button>
          </div>
        )}

        {!loading &&
          !err &&
          mostrarLista &&
          filtered.length === 0 && (
            <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
              No se encontraron productos con los filtros aplicados.
            </div>
          )}

        {!loading && !err && mostrarLista && filtered.length > 0 && (
          <>
            <div className="products-list">
              {paginatedData.map((r) => (
                <ProductCard key={r.id} r={r} />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn page-arrow"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        className={`page-btn ${
                          currentPage === pageNum ? 'active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span key={pageNum} className="page-dots">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  className="page-btn page-arrow"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal detalles */}
      {detailsOpen && details && (
        <>
          <div className="modal-overlay" onClick={() => setDetailsOpen(false)} />
          <div
            className="modal modal-compact"
            style={{ maxWidth: '600px', width: 'min(600px,94vw)' }}
          >
            {/* Header del modal con degradado */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                padding: '20px 24px',
                margin: '-20px -20px 20px -20px',
                borderRadius: '14px 14px 0 0',
                borderBottom: '1px solid #FFE4A3',
              }}
            >
              <h3 style={{ margin: 0, color: '#5D4037', fontSize: 22 }}>
                {details.nombre}
              </h3>
            </div>

            {details.imagen_url && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img
                  src={details.imagen_url}
                  alt={details.nombre}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    objectFit: 'contain',
                    borderRadius: 8,
                  }}
                />
              </div>
            )}

            <div className="modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  background: '#FAFAFA',
                  padding: 20,
                  borderRadius: 12,
                  border: '1px solid #E0E0E0',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>
                    Categoría
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>
                    {details.categoria_display}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>
                    Precio
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>
                    {currency(details.precio)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>
                    Stock Total
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>
                    {details.stock}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>
                    Reservado
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>
                    {details.stock_reservado ?? 0}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>
                    Disponible
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#4CAF50' }}>
                    {disponible(details)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>
                    Estado
                  </div>
                  <span
                    style={{
                      background: details.activo ? '#4CAF50' : '#E53935',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'inline-block',
                    }}
                  >
                    {details.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {details.descripcion && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#757575',
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Descripción
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: '#424242',
                      lineHeight: 1.6,
                      background: '#F5F5F5',
                      padding: 16,
                      borderRadius: 8,
                    }}
                  >
                    {details.descripcion}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                paddingTop: 20,
                borderTop: '1px solid #E0E0E0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                style={{
                  background: 'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                  color: '#5D4037',
                  border: '1px solid #FFE4A3',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => setDetailsOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal reservas */}
      {resvOpen && (
        <>
          <div className="modal-overlay" onClick={() => setResvOpen(false)} />
          <div
            className="modal"
            style={{ 
              maxWidth: '1000px', 
              width: 'min(1000px, 94vw)',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {/* Header del modal con degradado */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                padding: '24px 32px',
                borderBottom: '1px solid #FFE4A3',
              }}
            >
              <h3 style={{ margin: 0, color: '#5D4037', fontSize: 20, fontWeight: 700 }}>
                Reservas activas
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#8B4513', fontSize: 14 }}>
                {resvProd?.nombre || `Producto #${resvProd?.id}`}
              </p>
            </div>

            <div style={{ padding: '24px 32px', maxHeight: '70vh', overflow: 'auto' }}>
              {resvLoading && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: '4px solid #FFE4A3',
                      borderTop: '4px solid #DEB887',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <p style={{ color: '#757575', fontSize: 14 }}>Cargando reservas…</p>
                </div>
              )}
              
              {!resvLoading && resvErr && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: '#FFEBEE',
                    borderRadius: 12,
                    border: '2px dashed #EF5350',
                  }}
                >
                  <p style={{ color: '#C62828', fontSize: 15, margin: 0 }}>
                    {resvErr}
                  </p>
                </div>
              )}

              {!resvLoading && !resvErr && (
                <>
                  {resvRows.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#FAFAFA',
                        borderRadius: 12,
                        border: '2px dashed #E0E0E0',
                      }}
                    >
                      <ListOrdered size={56} color="#BDBDBD" style={{ marginBottom: 16 }} />
                      <h4 style={{ color: '#424242', margin: '0 0 8px 0', fontSize: 18 }}>
                        Sin reservas activas
                      </h4>
                      <p style={{ color: '#757575', fontSize: 14, margin: 0 }}>
                        Este producto no tiene reservas en este momento
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Tarjetas de reservas */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {resvRows.map((r, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E0E0E0',
                              borderRadius: 12,
                              padding: '20px',
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                              e.currentTarget.style.borderColor = '#FFE4A3';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                              e.currentTarget.style.borderColor = '#E0E0E0';
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span
                                  style={{
                                    background: r.origen === 'pedido' ? '#E3F2FD' : '#FFF3E0',
                                    color: r.origen === 'pedido' ? '#1565C0' : '#E65100',
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  {r.origen === 'pedido' ? '📦 Pedido' : r.origen === 'alquiler' ? '🔄 Alquiler' : '—'}
                                </span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#424242' }}>
                                  #{r.id_origen ?? r.id ?? '—'}
                                </span>
                              </div>
                              <span
                                style={{
                                  background:
                                    r.estado === 'pendiente' ? '#FFF3E0' :
                                    r.estado === 'confirmado' ? '#E8F5E9' :
                                    r.estado === 'entregado' ? '#E1F5FE' :
                                    r.estado === 'devuelto' ? '#F3E5F5' :
                                    '#F5F5F5',
                                  color:
                                    r.estado === 'pendiente' ? '#E65100' :
                                    r.estado === 'confirmado' ? '#2E7D32' :
                                    r.estado === 'entregado' ? '#0277BD' :
                                    r.estado === 'devuelto' ? '#6A1B9A' :
                                    '#616161',
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                {r.estado || 'Sin estado'}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                  Cliente
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>
                                  {r.cliente || 'Sin nombre'}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                  Cantidad
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#5D4037' }}>
                                  {r.cantidad ?? 0} {r.cantidad === 1 ? 'unidad' : 'unidades'}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                  Fecha inicio
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#424242' }}>
                                  {r.inicio
                                    ? new Date(r.inicio).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : '—'}
                                </div>
                                <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>
                                  {r.inicio
                                    ? new Date(r.inicio).toLocaleTimeString('es-AR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                  Fecha fin
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#424242' }}>
                                  {r.fin
                                    ? new Date(r.fin).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : '—'}
                                </div>
                                <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>
                                  {r.fin
                                    ? new Date(r.fin).toLocaleTimeString('es-AR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resumen total */}
                      <div
                        style={{
                          marginTop: 20,
                          background: 'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                          border: '2px solid #FFE4A3',
                          borderRadius: 12,
                          padding: '20px 24px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, color: '#8B4513', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                            Total reservado
                          </div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#5D4037' }}>
                            {totalReservado(resvRows)} {totalReservado(resvRows) === 1 ? 'unidad' : 'unidades'}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: '#8B4513' }}>
                          {resvRows.length} {resvRows.length === 1 ? 'reserva activa' : 'reservas activas'}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 32px',
                borderTop: '1px solid #E0E0E0',
                background: '#FAFAFA',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                style={{
                  background: 'linear-gradient(135deg, #FFF4D6 0%, #FFE5B3 100%)',
                  color: '#5D4037',
                  border: '1px solid #FFE4A3',
                  borderRadius: 8,
                  padding: '10px 28px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onClick={() => setResvOpen(false)}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        /* Header */
        .products-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        .products-info {
          flex: 1;
        }
        .products-info h3 {
          margin: 0 0 6px 0;
          font-size: 20px;
          font-weight: 700;
          color: #111;
        }
        .muted {
          margin: 0;
          font-size: 14px;
          color: #757575;
          font-weight: 400;
        }
        .products-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 12px;
          background: #fffdf2;
          border: 1px solid #e2d18a;
        }
        .search-box input {
          border: 0;
          outline: 0;
          background: transparent;
          min-width: 260px;
          color: #111;
          font-size: 14px;
        }
        .btn-gold {
          background: #ffd700;
          color: #111;
          border: 1px solid #d6b73f;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-gold:hover {
          background: #f4c430;
        }

        /* Filtros de categoría */
        .filter-chip {
          padding: 10px 20px;
          border-radius: 24px;
          border: 2px solid;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f5f5f5;
          color: #666;
          border-color: #e0e0e0;
        }
        .filter-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        /* Más Recientes chip */
        .recientes-chip {
          background: #fff9e6;
          color: #c77c2a;
          border-color: #e8a34d;
        }
        .recientes-chip.active {
          background: #e8a34d;
          color: #fff;
          border-color: #c77c2a;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(232, 163, 77, 0.3);
        }
        .recientes-chip:hover {
          background: #fff3cd;
        }
        .recientes-chip.active:hover {
          background: #d69a44;
        }

        /* Chips de categoría con colores dinámicos */
        .filter-chip:not(.recientes-chip) {
          background: color-mix(in srgb, var(--chip-color) 15%, white);
          color: #555;
          border-color: color-mix(in srgb, var(--chip-color) 30%, white);
        }
        .filter-chip:not(.recientes-chip).active {
          background: var(--chip-color);
          color: #fff;
          border-color: color-mix(in srgb, var(--chip-color) 80%, black);
          font-weight: 600;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--chip-color) 40%, transparent);
        }
        .filter-chip:not(.recientes-chip):hover {
          background: color-mix(in srgb, var(--chip-color) 25%, white);
        }
        .filter-chip:not(.recientes-chip).active:hover {
          background: color-mix(in srgb, var(--chip-color) 90%, black);
        }

        /* Botón limpiar filtros */
        .clear-filters-btn {
          padding: 10px 20px;
          border-radius: 24px;
          border: 2px solid #fecaca;
          background: #fff;
          color: #ef4444;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-left: auto;
          transition: all 0.25s ease;
        }
        .clear-filters-btn:hover {
          background: #fef2f2;
          border-color: #f87171;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        /* Lista de productos (horizontal) */
        .products-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Tarjeta horizontal */
        .product-card-horizontal {
          display: flex;
          align-items: stretch;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s;
          border: none;
          color: #fff;
        }
        .product-card-horizontal:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        .product-card-horizontal.card-inactive {
          opacity: 0.7;
          filter: grayscale(0.1);
        }
        .product-card-horizontal.card-active {
          opacity: 1;
        }

        /* Imagen */
        .product-image-container {
          position: relative;
          width: 180px;
          min-width: 180px;
          height: 180px;
          background: rgba(255,255,255,0.15);
        }
        .product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f9fafb;
          font-size: 13px;
        }

        /* Contenido */
        .product-content {
          flex: 1;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: transparent;
        }
        .product-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
        }
        .product-title {
          margin: 0 0 4px;
          font-size: 20px;
          font-weight: 600;
          color: #fff;
        }
        .product-cat {
          font-size: 13px;
          color: #f5f5f5;
          font-weight: 500;
        }
        .product-price {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
        }

        .product-stats-row {
          display: flex;
          gap: 24px;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-label {
          font-size: 11px;
          color: #f0f0f0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-val {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
        .stat-val.clickable {
          cursor: pointer;
          text-decoration: underline;
        }

        /* Acciones */
        .product-actions-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: rgba(0,0,0,0.08);
          min-width: 140px;
        }
        .action-btn {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.12);
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #fff;
          white-space: nowrap;
        }
        .action-btn:hover {
          background: rgba(255,255,255,0.22);
        }
        .action-btn.btn-deactivate {
          border-color: rgba(248,113,113,0.9);
        }
        .action-btn.btn-activate {
          border-color: rgba(74,222,128,0.9);
        }

        /* Paginación */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 28px;
          padding: 24px 0 8px;
          border-top: 1px solid #e5e5e5;
        }
        .page-btn {
          min-width: 38px;
          height: 38px;
          padding: 0 10px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #444;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .page-btn:hover:not(:disabled):not(.active) {
          border-color: #d6b73f;
          background: #fffbee;
          color: #111;
        }
        .page-btn.active {
          background: #ffd700;
          border-color: #d6b73f;
          color: #111;
          font-weight: 600;
        }
        .page-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .page-btn.page-arrow {
          font-size: 20px;
          font-weight: 400;
        }
        .page-dots {
          padding: 0 6px;
          color: #999;
          font-weight: 600;
          user-select: none;
        }

        /* Modales - CRÍTICO: z-index bien configurado */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 999;
        }
        .modal {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          background: #fff;
          color: #111;
          border-radius: 14px;
          padding: 20px;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          max-height: 92vh;
          overflow: auto;
          border: 1px solid #e0c65b;
        }
        .modal-compact .hero img {
          width: 100%;
          height: auto;
          max-height: 46vh;
          object-fit: contain;
          display: block;
          border-radius: 8px;
        }
        .modal-compact .grid-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
          margin-top: 12px;
        }
        .modal-body {
          padding: 12px 0;
        }
        .modal-actions {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .modal-actions.compact {
          padding-top: 16px;
          border-top: 1px solid #eee;
        }

        /* Botones de modales */
        .btn {
          border-radius: 10px;
          padding: 8px 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }

        /* Outline dorado por defecto (Ver reservas / Editar) */
        .btn-outline {
          border-radius: 10px;
          padding: 8px 16px;
          font-weight: 600;
          border: 1px solid #d6b73f;
          color: #111;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover {
          background: #ffd700;
        }

        /* Rojo / verde mantienen su color propio */
        .btn-outline.danger {
          border-color: #dc3545;
          color: #dc3545;
        }
        .btn-outline.danger:hover {
          background: #ffebee;
        }
        .btn-outline.success {
          border-color: #28a745;
          color: #28a745;
        }
        .btn-outline.success:hover {
          background: #e8f5e9;
        }

        /* Tabla en modal de reservas */
        .table-wrap {
          overflow-x: auto;
          margin-top: 16px;
        }
        .table-reservas {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .table-reservas th,
        .table-reservas td {
          padding: 14px 12px;
          text-align: left;
          border-bottom: 1px solid #F5F5F5;
        }
        .table-reservas th {
          background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
          font-weight: 700;
          font-size: 13px;
          color: #5D4037;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #FFE4A3;
        }
        .table-reservas td {
          font-size: 14px;
          color: #424242;
        }
        .table-reservas tbody tr {
          transition: all 0.2s;
        }
        .table-reservas tbody tr:hover {
          background: #FFFBF0;
        }
        .table-reservas tfoot tr {
          border-top: 2px solid #FFE4A3;
        }
        .table-reservas tfoot tr:hover {
          background: #FFF4D6 !important;
        }

        @media (max-width: 768px) {
          .products-header {
            flex-direction: column;
          }
          .products-controls {
            width: 100%;
            flex-direction: column;
          }
          .search-box {
            width: 100%;
          }
          .search-box input {
            width: 100%;
            min-width: 0;
          }
          .btn-gold {
            width: 100%;
            justify-content: center;
          }
          .product-card-horizontal {
            flex-direction: column;
          }
          .product-image-container {
            width: 100%;
            height: 200px;
          }
          .product-actions-col {
            flex-direction: row;
            flex-wrap: wrap;
            min-width: auto;
          }
          .action-btn {
            flex: 1;
            min-width: calc(50% - 4px);
          }
          .modal-compact .grid-two {
            grid-template-columns: 1fr;
          }
          .pagination {
            gap: 4px;
          }
          .page-btn {
            min-width: 34px;
            height: 34px;
            font-size: 13px;
          }
        }
      `}</style>
    </Layout>
  );
}