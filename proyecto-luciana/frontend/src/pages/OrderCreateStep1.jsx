// src/pages/OrderCreateStep1.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductLineItem from '../pages/ProductLineItem';
import ClientSearchSelector from '../pages/ClientSearchSelector';
import axios from '../api/axios';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Truck,
  Store,
  Shield,
} from 'lucide-react';
import { confirm, error } from './alerts';

const pad = (n) => String(n).padStart(2, '0');

const nowLocalISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const isValidYear = (dateStr) => {
  if (!dateStr) return true;
  const year = new Date(dateStr).getFullYear();
  return year >= 2024 && year <= 2030;
};

export default function OrderCreateStep1() {
  const navigate = useNavigate();
  const location = useLocation();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  // cabecera pedido
  const [clienteId, setClienteId] = useState('');
  const [evento, setEvento] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [devolucion, setDevolucion] = useState('');
  const [estado, setEstado] = useState('pendiente');
  const [tipoServicio, setTipoServicio] = useState('RETIRO');

  // datos de ENTREGA
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [referenciaEntrega, setReferenciaEntrega] = useState('');
  const [costoFlete, setCostoFlete] = useState('');
  const [zonaEntrega, setZonaEntrega] = useState('');

  // ítems
  const [items, setItems] = useState([]);
  const [itemErrs, setItemErrs] = useState([]);

  // errores y touched
  const [errs, setErrs] = useState({});
  const [touched, setTouched] = useState({});
  const [msg, setMsg] = useState('');

  const hoyISO = nowLocalISO();

  // Cargar catálogos
  useEffect(() => {
    (async () => {
      try {
        const [{ data: cl }, { data: pr }] = await Promise.all([
          axios.get('/api/clientes/'),
          axios.get('/api/productos/'),
        ]);
        setClientes(Array.isArray(cl) ? cl : cl.results || []);
        setProductos(Array.isArray(pr) ? pr : pr.results || []);
      } catch {
        error({ title: 'No se pudieron cargar catálogos' });
      }
    })();
  }, []);

  // Restaurar estado desde Step2
  useEffect(() => {
    const s = location.state;
    if (!s) return;

    setClienteId(s.clienteId || '');
    setEvento(s.evento || '');
    setFechaEntrega(s.fechaEntrega || '');
    setDevolucion(s.devolucion || '');
    setEstado(s.estado || 'pendiente');
    setTipoServicio(s.tipoServicio || 'RETIRO');
    setDireccionEntrega(s.direccionEntrega || '');
    setReferenciaEntrega(s.referenciaEntrega || '');
    setCostoFlete(s.costoFlete || '');
    const restored = Array.isArray(s.items) ? s.items : [];
    setItems(restored);
  }, [location.state]);

  // Calcular total de productos
  const totalProductos = useMemo(() => {
    return items.reduce((acc, it) => {
      const q = Number(it.cantidad || 0);
      const pu = Number(it.precio_unit || 0);
      return acc + q * pu;
    }, 0);
  }, [items]);

  // Total con flete (si aplica)
  const totalConFlete = useMemo(() => {
    const flete = tipoServicio === 'ENTREGA' ? parseFloat(costoFlete || 0) : 0;
    return Math.round((totalProductos + flete) * 100) / 100;
  }, [totalProductos, costoFlete, tipoServicio]);

  // Garantía (15% solo de productos)
  const garantia = useMemo(() => {
    return totalProductos * 0.15;
  }, [totalProductos]);

  // Validación individual de campo
  const validateField = (field, value) => {
    const now = new Date();
    now.setSeconds(0, 0);

    switch (field) {
      case 'cliente':
        if (!value) return 'Seleccioná un cliente.';
        return '';

      case 'evento': {
        if (!value) return 'Indicá fecha/hora del evento.';
        if (!isValidYear(value)) return 'El año debe estar entre 2024 y 2030.';
        const ev = new Date(value);
        if (!(ev instanceof Date && !isNaN(ev))) return 'Fecha inválida.';
        if (ev < now) return 'No podés elegir una fecha pasada.';
        return '';
      }

      case 'fechaEntrega': {
        if (!value) return 'Indicá fecha/hora de entrega.';
        if (!isValidYear(value)) return 'El año debe estar entre 2024 y 2030.';
        const ent = new Date(value);
        if (!(ent instanceof Date && !isNaN(ent))) return 'Fecha inválida.';
        if (ent < now) return 'No podés elegir una fecha pasada.';
        if (evento && ent >= new Date(evento)) {
          return 'La entrega debe ser antes del evento.';
        }
        return '';
      }

      case 'devolucion': {
        if (!value) return 'Indicá fecha/hora de devolución.';
        if (!isValidYear(value)) return 'El año debe estar entre 2024 y 2030.';
        const dev = new Date(value);
        if (!(dev instanceof Date && !isNaN(dev))) return 'Fecha inválida.';
        if (dev < now) return 'No podés elegir una fecha pasada.';
        if (evento && dev <= new Date(evento)) {
          return 'La devolución debe ser posterior al evento.';
        }
        return '';
      }

      case 'direccionEntrega':
        if (tipoServicio === 'ENTREGA' && !value.trim()) {
          return 'Indicá la dirección de entrega.';
        }
        return '';

      case 'costoFlete':
        if (tipoServicio === 'ENTREGA' && (!value || parseFloat(value) < 0)) {
          return 'Indicá el costo del flete (mayor o igual a 0).';
        }
        return '';

      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = {
      cliente: clienteId,
      evento,
      fechaEntrega,
      devolucion,
      direccionEntrega,
      costoFlete,
    }[field];
    const errorMsg = validateField(field, value);
    setErrs((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrs((prev) => ({ ...prev, [field]: errorMsg }));
    }
    setMsg('');
  };

  const getFieldStatus = (field) => {
    if (!touched[field]) return null;
    return errs[field] ? 'error' : 'success';
  };

  const clearItemErr = (idx, key) =>
    setItemErrs((prev) => {
      const arr = [...prev];
      const row = { ...(arr[idx] || {}) };
      if (key) delete row[key];
      if (Object.keys(row).length === 0) arr[idx] = undefined;
      else arr[idx] = row;
      return arr;
    });

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { producto: null, cantidad: 1, precio_unit: '', producto_nombre: '' },
    ]);
    setMsg('');
  };

  const rmItem = async (idx) => {
    const ok = await confirm({
      title: 'Quitar producto',
      message: '¿Seguro que querés eliminar esta fila?',
      okText: 'Sí, quitar',
      cancelText: 'Cancelar',
      tone: 'warn',
    });
    if (!ok) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updItem = (idx, patch) =>
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const validateStep1 = () => {
    const e = {};
    const eRows = [];

    // Validar campos principales
    const clienteErr = validateField('cliente', clienteId);
    if (clienteErr) e.cliente = clienteErr;

    const eventoErr = validateField('evento', evento);
    if (eventoErr) e.evento = eventoErr;

    const entregaErr = validateField('fechaEntrega', fechaEntrega);
    if (entregaErr) e.fechaEntrega = entregaErr;

    const devErr = validateField('devolucion', devolucion);
    if (devErr) e.devolucion = devErr;

    const dirErr = validateField('direccionEntrega', direccionEntrega);
    if (dirErr) e.direccionEntrega = dirErr;

    const fleteErr = validateField('costoFlete', costoFlete);
    if (fleteErr) e.costoFlete = fleteErr;

    if (items.length === 0) e.items = 'Agregá al menos un producto.';

    // Ítems
    items.forEach((it, idx) => {
      const er = {};
      if (!it.producto) er.producto = 'Seleccioná un producto.';
      if (!Number.isInteger(Number(it.cantidad)) || Number(it.cantidad) <= 0) {
        er.cantidad = 'Cant. > 0.';
      }
      if (it.precio_unit === '' || Number(it.precio_unit) < 0) {
        er.precio_unit = 'Precio ≥ 0.';
      }
      const p = productos.find((x) => x.id === Number(it.producto));
      if (p) {
        const disp =
          p.stock_disponible ??
          Math.max(0, (p.stock ?? 0) - (p.stock_reservado ?? 0));
        if (Number(it.cantidad) > disp) {
          er.cantidad = `No puede superar disponible (${disp}).`;
        }
      }
      if (Object.keys(er).length) eRows[idx] = er;
    });

    return { e, eRows };
  };

  const handleContinuar = (e) => {
    e.preventDefault();
    setMsg('');

    // Marcar todos los campos como touched
    setTouched({
      cliente: true,
      evento: true,
      fechaEntrega: true,
      devolucion: true,
      direccionEntrega: true,
      costoFlete: true,
    });

    const { e: eCab, eRows } = validateStep1();
    setErrs(eCab);
    setItemErrs(eRows || []);

    if (Object.keys(eCab).length || (eRows && eRows.length)) {
      setMsg('Por favor, corregí los errores en el formulario antes de continuar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    navigate('/pedidos/nuevo/pagos', {
      state: {
        clienteId,
        evento,
        fechaEntrega,
        devolucion,
        estado,
        tipoServicio,
        direccionEntrega: tipoServicio === 'ENTREGA' ? direccionEntrega : '',
        referenciaEntrega: tipoServicio === 'ENTREGA' ? referenciaEntrega : '',
        costoFlete: tipoServicio === 'ENTREGA' ? costoFlete : '',
        items,
        total: totalProductos,
        totalConFlete,
        garantia,
      },
    });
  };

  const hasData = useMemo(() => {
    return (
      clienteId ||
      evento ||
      fechaEntrega ||
      devolucion ||
      items.length > 0 ||
      (tipoServicio === 'ENTREGA' && direccionEntrega)
    );
  }, [clienteId, evento, fechaEntrega, devolucion, items.length, tipoServicio, direccionEntrega]);

  const handleBackToList = async () => {
    if (hasData) {
      const ok = await confirm({
        title: 'Tenés datos cargados en el formulario',
        message:
          'Si salís ahora, los datos cargados se van a perder.\n\n¿Seguro que querés volver a pedidos?',
        okText: 'Salir igualmente',
        cancelText: 'Cancelar',
        tone: 'warn',
      });
      if (!ok) return;
    }
    navigate('/pedidos');
  };

  const styles = {
    container: {
      maxWidth: '100%',
      padding: '24px 24px 40px',
    },
    outerCard: {
      background: '#ffffff',
      borderRadius: 16,
      padding: 32,
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
      border: '1px solid #e5e7eb',
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
    },
    backLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      color: '#4b5563',
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 700,
      color: '#111827',
      margin: 0,
    },
    alertError: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 12,
      color: '#991b1b',
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 20,
      color: '#374151',
    },
    cardSection: {
      background: '#F9FAFB',
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
      border: '1px solid #E5E7EB',
    },
    fieldGroup: {
      marginBottom: 20,
    },
    label: {
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      color: '#6b7280',
      marginBottom: 8,
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      fontSize: 14,
      border: '1px solid #d1d5db',
      borderRadius: 8,
      background: '#fff',
      color: '#111827',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.15s ease',
    },
    inputError: {
      borderColor: '#ef4444',
      background: '#fef2f2',
    },
    inputSuccess: {
      borderColor: '#10b981',
      background: '#f0fdf4',
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
    },
    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20,
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      fontSize: 14,
      borderRadius: 8,
      border: '1px solid #d1d5db',
      background: '#fff',
      color: '#111827',
      outline: 'none',
      cursor: 'pointer',
    },
    buttonRow: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-start',
      marginTop: 8,
    },
    primaryButton: {
      padding: '12px 28px',
      fontSize: 15,
      fontWeight: 600,
      background: '#c9a961',
      color: '#fff',
      border: 'none',
      borderRadius: 999,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: '0 10px 25px rgba(201,169,97,0.4)',
      transition: 'all 0.2s',
    },
    secondaryButton: {
      padding: '12px 24px',
      fontSize: 15,
      fontWeight: 500,
      background: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: 999,
      cursor: 'pointer',
    },
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.outerCard}>
          {/* Header */}
          <div style={styles.headerRow}>
            <button type="button" onClick={handleBackToList} style={styles.backLink}>
              <ArrowLeft size={16} />
              Volver a pedidos
            </button>
            <h1 style={styles.headerTitle}>Nuevo pedido</h1>
          </div>

          {msg && (
            <div style={styles.alertError}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Error en el formulario</div>
                <div style={{ fontSize: 14 }}>{msg}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleContinuar}>
            {/* Información del cliente */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Información del cliente</div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Cliente</label>
                <ClientSearchSelector
                  clientes={clientes}
                  selectedClientId={clienteId}
                  onClientSelect={(id) => {
                    setClienteId(String(id));
                    if (touched.cliente) {
                      const errorMsg = validateField('cliente', String(id));
                      setErrs(prev => ({ ...prev, cliente: errorMsg }));
                    }
                    setMsg('');
                  }}
                  onClientClear={() => {
                    setClienteId('');
                    setTouched(prev => ({ ...prev, cliente: true }));
                    setErrs(prev => ({ ...prev, cliente: 'Seleccioná un cliente.' }));
                  }}
                  error={errs.cliente}
                  touched={touched.cliente}
                />
              </div>
            </div>

            {/* Tipo de Servicio */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Tipo de servicio</div>

              <div style={styles.grid2}>
                <div
                  onClick={() => {
                    setTipoServicio('ENTREGA');
                    setMsg('');
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border:
                      tipoServicio === 'ENTREGA'
                        ? '3px solid #667eea'
                        : '2px solid #e2e8f0',
                    background:
                      tipoServicio === 'ENTREGA' ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Truck
                    size={32}
                    color={tipoServicio === 'ENTREGA' ? '#667eea' : '#94a3b8'}
                  />
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: tipoServicio === 'ENTREGA' ? '#667eea' : '#1e293b',
                    }}
                  >
                    ENTREGA
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      textAlign: 'center',
                    }}
                  >
                    Llevamos los productos al cliente
                  </div>
                </div>

                <div
                  onClick={() => {
                    setTipoServicio('RETIRO');
                    setCostoFlete('');
                    setMsg('');
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border:
                      tipoServicio === 'RETIRO'
                        ? '3px solid #10b981'
                        : '2px solid #e2e8f0',
                    background:
                      tipoServicio === 'RETIRO' ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Store
                    size={32}
                    color={tipoServicio === 'RETIRO' ? '#10b981' : '#94a3b8'}
                  />
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: tipoServicio === 'RETIRO' ? '#10b981' : '#1e293b',
                    }}
                  >
                    RETIRO
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      textAlign: 'center',
                    }}
                  >
                    Cliente retira en nuestro local
                  </div>
                </div>
              </div>

              {tipoServicio === 'ENTREGA' && (
                <div style={{ marginTop: 20 }}>
                  <div style={styles.grid2}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>
                        Dirección de entrega <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={direccionEntrega}
                        onChange={(e) =>
                          handleChange('direccionEntrega', e.target.value, setDireccionEntrega)
                        }
                        onBlur={() => handleBlur('direccionEntrega')}
                        placeholder="Calle, número, barrio, ciudad"
                        style={{
                          ...styles.input,
                          ...(getFieldStatus('direccionEntrega') === 'error' && styles.inputError),
                          ...(getFieldStatus('direccionEntrega') === 'success' && styles.inputSuccess),
                        }}
                      />
                      {errs.direccionEntrega && touched.direccionEntrega && (
                        <div style={styles.errorText}>{errs.direccionEntrega}</div>
                      )}
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Referencia / piso / depto (opcional)</label>
                      <input
                        type="text"
                        value={referenciaEntrega}
                        onChange={(e) => setReferenciaEntrega(e.target.value)}
                        placeholder="Ej: casa verde, portón negro, piso 3"
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Campo de costo de flete */}
                  <div style={{ marginTop: 20 }}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>
                        Costo de flete <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costoFlete}
                        onChange={(e) =>
                          handleChange('costoFlete', e.target.value, setCostoFlete)
                        }
                        onBlur={() => handleBlur('costoFlete')}
                        placeholder="0.00"
                        style={{
                          ...styles.input,
                          ...(getFieldStatus('costoFlete') === 'error' && styles.inputError),
                          ...(getFieldStatus('costoFlete') === 'success' && styles.inputSuccess),
                        }}
                      />
                      {errs.costoFlete && touched.costoFlete && (
                        <div style={styles.errorText}>{errs.costoFlete}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fechas */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Fechas del pedido</div>

              <div style={styles.grid3}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Fecha y hora del evento</label>
                  <input
                    type="datetime-local"
                    min={hoyISO}
                    max="2030-12-31T23:59"
                    value={evento}
                    onChange={(e) => {
                      handleChange('evento', e.target.value, setEvento);
                      if (devolucion && new Date(e.target.value) >= new Date(devolucion)) {
                        setDevolucion('');
                        setErrs((prev) => ({ ...prev, devolucion: '' }));
                      }
                    }}
                    onBlur={() => handleBlur('evento')}
                    style={{
                      ...styles.input,
                      ...(getFieldStatus('evento') === 'error' && styles.inputError),
                      ...(getFieldStatus('evento') === 'success' && styles.inputSuccess),
                    }}
                  />
                  {errs.evento && touched.evento && (
                    <div style={styles.errorText}>{errs.evento}</div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Fecha y hora de entrega</label>
                  <input
                    type="datetime-local"
                    min={hoyISO}
                    max="2030-12-31T23:59"
                    value={fechaEntrega}
                    onChange={(e) => handleChange('fechaEntrega', e.target.value, setFechaEntrega)}
                    onBlur={() => handleBlur('fechaEntrega')}
                    style={{
                      ...styles.input,
                      ...(getFieldStatus('fechaEntrega') === 'error' && styles.inputError),
                      ...(getFieldStatus('fechaEntrega') === 'success' && styles.inputSuccess),
                    }}
                  />
                  {errs.fechaEntrega && touched.fechaEntrega && (
                    <div style={styles.errorText}>{errs.fechaEntrega}</div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Fecha y hora de devolución</label>
                  <input
                    type="datetime-local"
                    min={evento || hoyISO}
                    max="2030-12-31T23:59"
                    value={devolucion}
                    onChange={(e) => handleChange('devolucion', e.target.value, setDevolucion)}
                    onBlur={() => handleBlur('devolucion')}
                    style={{
                      ...styles.input,
                      ...(getFieldStatus('devolucion') === 'error' && styles.inputError),
                      ...(getFieldStatus('devolucion') === 'success' && styles.inputSuccess),
                    }}
                  />
                  {errs.devolucion && touched.devolucion && (
                    <div style={styles.errorText}>{errs.devolucion}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Estado */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Estado del pedido</div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  style={styles.select}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
            </div>

            {/* Productos */}
            <div style={styles.cardSection}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <div style={{ ...styles.sectionTitle, marginBottom:0 }}>Productos</div>
                <button
                  type="button"
                  onClick={addItem}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#c9a961',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(201,169,97,0.3)',
                  }}
                >
                  <Plus size={16} />
                  Agregar producto
                </button>
              </div>

              {/* Lista de productos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {items.map((item, idx) => {
                  const er = itemErrs[idx] || {};
                  return (
                    <ProductLineItem
                      key={idx}
                      productos={productos}
                      value={item}
                      onChange={(data) => {
                        updItem(idx, data);
                        clearItemErr(idx);
                        setMsg('');
                      }}
                      onRemove={() => rmItem(idx)}
                      error={er.producto || er.cantidad}
                    />
                  );
                })}

                {items.length === 0 && (
                  <div style={{
                    padding: '40px 24px',
                    fontSize: '14px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    background: 'white',
                    borderRadius: 8,
                    border: '2px dashed #e5e7eb',
                  }}>
                    No hay productos cargados. Usá el botón <strong>"Agregar producto"</strong> para comenzar.
                  </div>
                )}
              </div>

              {errs.items && (
                <div
                  style={{
                    color: '#ef4444',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: 12,
                  }}
                >
                  <AlertCircle size={16} />
                  {errs.items}
                </div>
              )}

              {/* Resumen de totales */}
              <div
                style={{
                  marginTop: 16,
                  padding: '20px',
                  background: 'white',
                  borderRadius: 12,
                  border: '2px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Subtotal productos */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Subtotal productos:</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                      ${Number(totalProductos || 0).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Flete (solo si es ENTREGA y hay costo) */}
                  {tipoServicio === 'ENTREGA' && costoFlete && parseFloat(costoFlete) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>Costo de flete:</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                        ${parseFloat(costoFlete || 0).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Línea divisoria */}
                  <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />

                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Total:</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#c9a961' }}>
                      ${Number(totalConFlete || 0).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Garantía estimada (15%) */}
                  {totalProductos > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '12px 16px',
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: '#78350f',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 500,
                        }}
                      >
                        <Shield size={16} />
                        Garantía estimada (15% s/productos):
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#78350f' }}>
                        ${garantia.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer botones */}
            <div style={styles.buttonRow}>
              <button
                type="submit"
                disabled={!hasData}
                style={{
                  ...styles.primaryButton,
                  opacity: hasData ? 1 : 0.6,
                  cursor: hasData ? 'pointer' : 'not-allowed',
                }}
              >
                {hasData ? 'Continuar a pagos' : 'Completá el formulario'}
              </button>

              <button
                type="button"
                onClick={handleBackToList}
                style={styles.secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </form>

          <p
            style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            Paso 1 de 2: Datos del pedido, productos y tipo de servicio
          </p>
        </div>
      </div>
    </Layout>
  );
}