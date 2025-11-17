// src/pages/OrderCreateStep2.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import {
  ArrowLeft,
  Shield,
  Upload,
  AlertCircle,
  MessageCircle,
  Loader2,
  MapPin,
  Truck,
  Package,
} from 'lucide-react';
import { error, success, confirm } from './alerts';

// Información de cuentas bancarias
const CUENTAS_BANCARIAS = [
  {
    id: 1,
    banco: 'Banco Naranja X',
    alias: 'Bri1925',
    cbu: '4530000800017698619478',
    titular: 'Brisa Itzel Michel',
    color: '#ff6b00'
  },
  {
    id: 2,
    banco: 'Banco Macro',
    alias: 'MACRO.BRISA',
    cbu: '2850590940090418420001',
    titular: 'Brisa Itzel Michel',
    color: '#0066cc'
  }
];

const WHATSAPP_NUMBER = '543875130659';

export default function OrderCreateStep2() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  useEffect(() => {
    if (!state) {
      navigate('/pedidos/nuevo', { replace: true });
    }
  }, [state, navigate]);

  const clienteId = state?.clienteId || '';
  const evento = state?.evento || '';
  const fechaEntrega = state?.fechaEntrega || '';
  const devolucion = state?.devolucion || '';
  const items = state?.items || [];
  const totalProductos = state?.total || 0; // 🆕 Solo productos
  const totalConFlete = state?.totalConFlete || 0; // 🆕 Productos + flete
  const costoFlete = state?.costoFlete || 0; // 🆕
  const garantiaCalculada = state?.garantia || 0; // 🆕 15% del total con flete
  const tipoServicio = state?.tipoServicio || 'RETIRO';
  const direccionPaso1 = state?.direccionEntrega || '';
  const referenciaPaso1 = state?.referenciaEntrega || '';
  const zonaEntrega = state?.zonaEntrega || ''; // 🆕

  // seña / pago
  const [senia, setSenia] = useState('');
  const [autoSenia, setAutoSenia] = useState(true);
  const [formaPago, setFormaPago] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState(null);

  // garantía - 🆕 Usar garantía calculada del 15%
  const [garantiaMonto, setGarantiaMonto] = useState('');
  const [autoGarantia, setAutoGarantia] = useState(true);
  const [garantiaEstado, setGarantiaEstado] = useState('pendiente');
  const [garantiaTipo, setGarantiaTipo] = useState('dni');
  const [garantiaFile, setGarantiaFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [errs, setErrs] = useState({});

  // Modal entrega
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [pedidoCreadoId, setPedidoCreadoId] = useState(null);
  const [entregaDireccion, setEntregaDireccion] = useState(direccionPaso1);
  const [entregaReferencia, setEntregaReferencia] = useState(referenciaPaso1);
  const [entregaPersona, setEntregaPersona] = useState('');
  const [entregaTelefono, setEntregaTelefono] = useState('');
  const [entregaHorario, setEntregaHorario] = useState('');
  const [entregaErrs, setEntregaErrs] = useState({});
  const [savingEntrega, setSavingEntrega] = useState(false);

  // 🆕 Calcular seña en base al total CON flete, garantía solo sobre productos
  useEffect(() => {
    if (autoSenia) {
      const calc = (Number(totalConFlete) * 0.2).toFixed(2);
      setSenia(isNaN(calc) ? '0.00' : calc);
    }
    if (autoGarantia) {
      // ✅ Garantía del 15% SOLO sobre productos (SIN flete)
      setGarantiaMonto(garantiaCalculada.toFixed(2));
    }
  }, [totalConFlete, garantiaCalculada, autoSenia, autoGarantia]);

  const validateStep2 = () => {
    const e = {};
    if (!formaPago) e.formaPago = 'Seleccioná un método de pago.';
    if (senia === '' || Number(senia) < 0)
      e.senia = 'Ingresá una seña (0 si no hay).';
    if (garantiaMonto === '' || Number(garantiaMonto) < 0)
      e.garantiaMonto = 'Ingresá un monto de garantía (0 si no hay).';
    return e;
  };

  const validateEntrega = () => {
    const e = {};
    if (!entregaDireccion.trim())
      e.direccion = 'Ingresá la dirección de entrega.';
    if (!entregaPersona.trim()) e.persona = 'Ingresá quién recibe.';
    if (!entregaTelefono.trim())
      e.telefono = 'Ingresá un teléfono de contacto.';
    return e;
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setMsg('');

    const eCab = validateStep2();
    setErrs(eCab);
    if (Object.keys(eCab).length) {
      setMsg('Revisá los campos marcados.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);

      const itemsPayload = items.map((it) => ({
        producto_id: Number(it.producto),
        cantidad: Number(it.cantidad),
        precio_unit: Number(it.precio_unit || 0)
      }));

      const form = new FormData();
      form.append('cliente_id', String(clienteId));
      form.append('fecha_hora_evento', new Date(evento).toISOString());
      if (fechaEntrega) {
        form.append(
          'fecha_hora_entrega',
          new Date(fechaEntrega).toISOString()
        );
      }
      form.append('fecha_hora_devolucion', new Date(devolucion).toISOString());

      // ✅ Tipo de servicio y dirección
      form.append('tipo_entrega', tipoServicio === 'ENTREGA' ? 'envio' : 'retiro');
      
      // 🆕 Si es ENTREGA, enviar zona y dirección
      if (tipoServicio === 'ENTREGA') {
        if (zonaEntrega) {
          form.append('zona_entrega', zonaEntrega);
        }
        if (direccionPaso1) {
          form.append('direccion_evento', direccionPaso1);
        }
        if (referenciaPaso1) {
          form.append('referencia_entrega', referenciaPaso1);
        }
      }

      // Seña / Pago
      form.append('senia', String(Number(senia || 0)));
      form.append('forma_pago', formaPago || 'efectivo');

      if (comprobanteFile) {
        form.append('comprobante_file', comprobanteFile);
      }

      // Garantía
      form.append('garantia_monto', String(Number(garantiaMonto || 0)));
      if (garantiaTipo) form.append('garantia_tipo', garantiaTipo);
      if (garantiaEstado) form.append('garantia_estado', garantiaEstado);

      if (garantiaFile) {
        if (garantiaTipo === 'dni') {
          form.append('garantia_dni_file', garantiaFile);
        } else if (garantiaTipo === 'servicio') {
          form.append('garantia_serv_file', garantiaFile);
        } else {
          form.append('garantia_otro_file', garantiaFile);
        }
      }

      form.append('items', JSON.stringify(itemsPayload));

      // POST pedido
      const resp = await axios.post('/api/pedidos/crear/', form);
      const pedidoData = resp?.data?.pedido || resp?.data || {};
      const pedidoId = pedidoData.id;

      if (tipoServicio === 'ENTREGA' && pedidoId) {
        setPedidoCreadoId(pedidoId);
        setShowEntregaModal(true);
        await success({
          title: 'Pedido creado',
          message: 'El pedido fue registrado. Ahora completá los datos de entrega.'
        });
      } else {
        await success({
          title: 'Pedido creado',
          message: 'El pedido fue registrado correctamente.'
        });
        navigate('/pedidos', { replace: true, state: { created: true } });
      }
    } catch (err) {
      const backendMsg = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      setMsg(`No se pudo crear el pedido. ${backendMsg}`);
      error({ title: 'No se pudo crear', message: backendMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEntrega = async () => {
    const e = validateEntrega();
    setEntregaErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSavingEntrega(true);

      await axios.patch(`/api/pedidos/${pedidoCreadoId}/`, {
        direccion_evento: entregaDireccion,
        referencia_entrega: entregaReferencia,
        persona_recibe: entregaPersona,
        telefono_contacto: entregaTelefono,
      });

      await success({
        title: 'Entrega registrada',
        message: 'Se guardó la dirección y los datos de entrega.'
      });

      setShowEntregaModal(false);
      navigate('/pedidos', { replace: true, state: { created: true } });
    } catch (err) {
      const backendMsg = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      error({
        title: 'No se pudo guardar la entrega',
        message: backendMsg
      });
    } finally {
      setSavingEntrega(false);
    }
  };

  const handleOmitirEntregaAhora = () => {
    setShowEntregaModal(false);
    navigate('/pedidos', { replace: true, state: { created: true } });
  };

  const handleCancelar = async () => {
    const hayDatos =
      senia ||
      formaPago ||
      garantiaMonto ||
      garantiaEstado !== 'pendiente' ||
      garantiaTipo !== 'dni' ||
      comprobanteFile ||
      garantiaFile;

    if (hayDatos) {
      const ok = await confirm({
        title: 'Cancelar pedido',
        message:
          'Si cancelás ahora se perderán los datos de pago y garantía cargados.',
        okText: 'Sí, salir',
        cancelText: 'Seguir editando',
        tone: 'warn'
      });
      if (!ok) return;
    }
    navigate('/pedidos');
  };

  function copiarTexto(texto) {
    navigator.clipboard.writeText(texto);
  }

  function enviarWhatsApp() {
    const mensaje = `Hola! Necesito enviar un comprobante de pago del pedido.\n\nTotal: $${totalConFlete}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      mensaje
    )}`;
    window.open(url, '_blank');
  }

  const getGarantiaFileName = () => {
    if (!garantiaFile) return 'Seleccionar archivo';
    const name = garantiaFile.name;
    return name.length > 30
      ? `${name.substring(0, 15)}...${name.substring(name.length - 10)}`
      : name;
  };

  if (!state) return null;

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
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 6,
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
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
            <button
              type="button"
              onClick={() => navigate('/pedidos/nuevo', { state })}
              style={styles.backLink}
            >
              <ArrowLeft size={16} />
              Volver al paso 1
            </button>
            <h1 style={styles.headerTitle}>Pago y garantía</h1>
            <div
              style={{
                marginLeft: 'auto',
                background: '#dcfce7',
                color: '#16a34a',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Paso 2 de 2
            </div>
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

          <form onSubmit={handleGuardar}>
            {/* 🆕 Resumen mejorado */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Resumen del pedido</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={styles.grid2}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>
                      CLIENTE ID
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                      #{clienteId}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>
                      PRODUCTOS
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                      {items.length} {items.length === 1 ? 'producto' : 'productos'}
                    </div>
                  </div>
                </div>

                {/* 🆕 Desglose de totales */}
                <div
                  style={{
                    padding: 20,
                    background: 'white',
                    borderRadius: 12,
                    border: '2px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Subtotal productos */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Package size={16} />
                        Subtotal productos:
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                        ${Number(totalProductos || 0).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Costo de flete */}
                    {tipoServicio === 'ENTREGA' && costoFlete > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Truck size={16} />
                            Flete ({zonaEntrega}):
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 600, color: '#4338ca' }}>
                            ${costoFlete.toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
                      </>
                    )}

                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                        Total del pedido:
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#c9a961' }}>
                        ${Number(totalConFlete || 0).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>

                    {/* 🆕 Garantía estimada (15% SOLO de productos) */}
                    <div
                      style={{
                        marginTop: 8,
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
                        ${garantiaCalculada.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seña y pago */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Seña y forma de pago</div>

              <div style={styles.grid2}>
                {/* Seña */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Monto de seña <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={senia}
                    onChange={(e) => {
                      setSenia(e.target.value);
                      setAutoSenia(false);
                    }}
                    disabled={autoSenia}
                    style={{
                      ...styles.input,
                      ...(errs.senia && styles.inputError),
                      background: autoSenia ? '#f9fafb' : '#fff',
                      cursor: autoSenia ? 'not-allowed' : 'text',
                    }}
                  />
                  {errs.senia && <div style={styles.errorText}>{errs.senia}</div>}
                  
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 12,
                      padding: 12,
                      background: 'white',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoSenia}
                      onChange={(e) => {
                        setAutoSenia(e.target.checked);
                        if (!e.target.checked && senia === '') {
                          setSenia('0.00');
                        }
                      }}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                        Calcular 20% automáticamente
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        Se calcula sobre el total (incluye flete)
                      </div>
                    </div>
                  </label>

                  {/* Alerta si seña es 0 */}
                  {Number(senia) === 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                        <strong>Seña $0:</strong> El cliente aún no pagó ningún adelanto. 
                        El pedido quedará como presupuesto hasta que se reciba el pago.
                      </div>
                    </div>
                  )}
                </div>

                {/* Método de pago */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Método de pago <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    style={{
                      ...styles.select,
                      ...(errs.formaPago && styles.inputError),
                    }}
                  >
                    <option value="">— Seleccioná —</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                  {errs.formaPago && <div style={styles.errorText}>{errs.formaPago}</div>}
                </div>
              </div>

              {/* Info bancaria */}
              {formaPago === 'transferencia' && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ ...styles.sectionTitle, marginBottom: 16 }}>
                    Datos para transferencia
                  </div>

                  {CUENTAS_BANCARIAS.map((cuenta) => (
                    <div
                      key={cuenta.id}
                      style={{
                        padding: 20,
                        background: 'white',
                        border: `2px solid ${cuenta.color}30`,
                        borderRadius: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#111827',
                          marginBottom: 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: cuenta.color,
                          }}
                        />
                        {cuenta.banco}
                      </div>

                      <div style={{ ...styles.grid2, gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>
                            ALIAS
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#111827',
                                fontFamily: 'monospace',
                              }}
                            >
                              {cuenta.alias}
                            </span>
                            <button
                              type="button"
                              onClick={() => copiarTexto(cuenta.alias)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                background: cuenta.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              Copiar
                            </button>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>
                            CBU
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#111827',
                                fontFamily: 'monospace',
                              }}
                            >
                              {cuenta.cbu}
                            </span>
                            <button
                              type="button"
                              onClick={() => copiarTexto(cuenta.cbu)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                background: cuenta.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              Copiar
                            </button>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>
                            TITULAR
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {cuenta.titular}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: 16,
                      padding: 16,
                      background: '#f0fdf4',
                      border: '2px solid #86efac',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                        ¿Ya realizaste la transferencia?
                      </div>
                      <div style={{ fontSize: 13, color: '#15803d' }}>
                        Enviá el comprobante por WhatsApp
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={enviarWhatsApp}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 18px',
                        background: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <MessageCircle size={18} />
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {/* Comprobante */}
              <div style={{ marginTop: 24 }}>
                <label style={styles.label}>Comprobante de pago (opcional)</label>
                <div
                  style={{
                    padding: 20,
                    border: '2px dashed #d1d5db',
                    borderRadius: 12,
                    background: 'white',
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                    id="comprobante-upload"
                  />
                  <label
                    htmlFor="comprobante-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      background: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={16} />
                    {comprobanteFile ? comprobanteFile.name : 'Seleccionar archivo'}
                  </label>
                </div>
              </div>
            </div>

            {/* Garantía */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Garantía</div>

              <div style={styles.grid2}>
                {/* Monto */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Monto de garantía</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={garantiaMonto}
                    onChange={(e) => {
                      setGarantiaMonto(e.target.value);
                      setAutoGarantia(false);
                    }}
                    disabled={autoGarantia}
                    style={{
                      ...styles.input,
                      ...(errs.garantiaMonto && styles.inputError),
                      background: autoGarantia ? '#f9fafb' : '#fff',
                      cursor: autoGarantia ? 'not-allowed' : 'text',
                    }}
                  />
                  {errs.garantiaMonto && <div style={styles.errorText}>{errs.garantiaMonto}</div>}
                  
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 12,
                      padding: 12,
                      background: 'white',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoGarantia}
                      onChange={(e) => {
                        setAutoGarantia(e.target.checked);
                        if (!e.target.checked && garantiaMonto === '') {
                          setGarantiaMonto('0.00');
                        }
                      }}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                        Calcular 15% automáticamente
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        Se calcula sobre subtotal de productos (sin flete)
                      </div>
                    </div>
                  </label>

                  {/* Alerta si garantía es mayor a 0 */}
                  {Number(garantiaMonto) > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        background: '#dbeafe',
                        border: '1px solid #60a5fa',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <Shield size={16} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
                        <strong>Garantía ${Number(garantiaMonto).toLocaleString()}:</strong> Este monto se registra 
                        pero NO está cobrado. Recordá cambiar el estado a "Monto/Documento Recibido" cuando 
                        el cliente entregue la garantía.
                      </div>
                    </div>
                  )}
                </div>

                {/* Tipo respaldo */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Tipo de respaldo</label>
                  <select
                    value={garantiaTipo}
                    onChange={(e) => setGarantiaTipo(e.target.value)}
                    style={styles.select}
                  >
                    <option value="dni">Copia de DNI</option>
                    <option value="servicio">Servicio/Boleta</option>
                    <option value="otro">Otro Documento</option>
                  </select>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
                    Documento que se tomará como garantía de respaldo.
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Estado de la garantía</label>
                <select
                  value={garantiaEstado}
                  onChange={(e) => setGarantiaEstado(e.target.value)}
                  style={styles.select}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="depositada">Monto/Documento Recibido</option>
                  <option value="devuelta">Devuelto</option>
                </select>
              </div>

              {/* Archivo respaldo */}
              <div style={{ marginTop: 20 }}>
                <label style={styles.label}>Subir archivo de respaldo (opcional)</label>
                <div
                  style={{
                    padding: 20,
                    border: '2px dashed #d1d5db',
                    borderRadius: 12,
                    background: 'white',
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setGarantiaFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                    id="garantia-upload"
                  />
                  <label
                    htmlFor="garantia-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      background: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={16} />
                    {getGarantiaFileName()}
                  </label>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
                  Acepta imágenes y PDF. El archivo se asocia al tipo de respaldo
                  seleccionado ({garantiaTipo}).
                </p>
              </div>
            </div>

            {/* Footer botones */}
            <div style={styles.buttonRow}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...styles.primaryButton,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    Guardando...
                  </>
                ) : (
                  'Crear pedido'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelar}
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
            Paso 2 de 2: Configuración de pago y garantía
          </p>
        </div>
      </div>

      {/* Modal ENTREGA */}
      {showEntregaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              // Click fuera del modal no hace nada por ahora
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 600,
              background: 'white',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 20px 45px rgba(15,23,42,0.35)',
            }}
          >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#f0f4ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={24} color="#667eea" />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                  Datos de entrega del pedido
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                  Este pedido es con <strong>ENTREGA</strong>. Completá la dirección y los datos de contacto para la logística.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {/* Dirección */}
              <div>
                <label style={{ ...styles.label, marginBottom: 6 }}>
                  Dirección de entrega <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={entregaDireccion}
                  onChange={(e) => setEntregaDireccion(e.target.value)}
                  placeholder="Calle, número, barrio, ciudad"
                  style={{
                    ...styles.input,
                    ...(entregaErrs.direccion && styles.inputError),
                  }}
                />
                {entregaErrs.direccion && (
                  <div style={styles.errorText}>{entregaErrs.direccion}</div>
                )}
              </div>

              {/* Referencia */}
              <div>
                <label style={{ ...styles.label, marginBottom: 6 }}>
                  Referencia / piso / depto (opcional)
                </label>
                <input
                  type="text"
                  value={entregaReferencia}
                  onChange={(e) => setEntregaReferencia(e.target.value)}
                  placeholder="Ej: Casa verde, portón negro, piso 3, depto B"
                  style={styles.input}
                />
              </div>

              {/* Persona + Teléfono */}
              <div style={styles.grid2}>
                <div>
                  <label style={{ ...styles.label, marginBottom: 6 }}>
                    Persona que recibe <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={entregaPersona}
                    onChange={(e) => setEntregaPersona(e.target.value)}
                    placeholder="Nombre y apellido"
                    style={{
                      ...styles.input,
                      ...(entregaErrs.persona && styles.inputError),
                    }}
                  />
                  {entregaErrs.persona && (
                    <div style={styles.errorText}>{entregaErrs.persona}</div>
                  )}
                </div>

                <div>
                  <label style={{ ...styles.label, marginBottom: 6 }}>
                    Teléfono de contacto <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={entregaTelefono}
                    onChange={(e) => setEntregaTelefono(e.target.value)}
                    placeholder="Ej: 3875 123456"
                    style={{
                      ...styles.input,
                      ...(entregaErrs.telefono && styles.inputError),
                    }}
                  />
                  {entregaErrs.telefono && (
                    <div style={styles.errorText}>{entregaErrs.telefono}</div>
                  )}
                </div>
              </div>

              {/* Horario */}
              <div>
                <label style={{ ...styles.label, marginBottom: 6 }}>
                  Franja horaria preferida (opcional)
                </label>
                <input
                  type="text"
                  value={entregaHorario}
                  onChange={(e) => setEntregaHorario(e.target.value)}
                  placeholder="Ej: entre 9:00 y 11:00 hs"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Footer modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={handleOmitirEntregaAhora}
                style={{
                  ...styles.secondaryButton,
                  padding: '10px 20px',
                  fontSize: 14,
                }}
              >
                Completar más tarde
              </button>
              <button
                type="button"
                onClick={handleGuardarEntrega}
                disabled={savingEntrega}
                style={{
                  ...styles.primaryButton,
                  padding: '10px 20px',
                  fontSize: 14,
                  opacity: savingEntrega ? 0.6 : 1,
                  cursor: savingEntrega ? 'not-allowed' : 'pointer',
                }}
              >
                {savingEntrega ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Guardando...
                  </>
                ) : (
                  'Guardar entrega'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}