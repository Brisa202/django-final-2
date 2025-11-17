// src/pages/FacturaPDF.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import logo from '../assets/logo.png';
import { ArrowLeft, Printer, FileText, Truck } from 'lucide-react';
import axios from '../api/axios';

const GOLD = '#C19A6B';
const GOLD_SOFT = '#F8F3EA';
const BORDER = '#E0E0E0';

// Porcentajes de referencia para PRESUPUESTO
const SENIA_PORC = 20;
const GARANTIA_PORC = 15;

const money = (n) =>
  `\$ ${Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Zonas de entrega
const ZONAS_ENTREGA = [
  { value: 'Zona Macrocentro', label: 'Zona Macrocentro', costo: 2800 },
  { value: 'Zona Norte', label: 'Zona Norte', costo: 3000 },
  { value: 'Zona Oeste', label: 'Zona Oeste', costo: 4000 },
  { value: 'Zona Este', label: 'Zona Este', costo: 5000 },
  { value: 'Zona Sur', label: 'Zona Sur', costo: 5500 },
];

export default function FacturaPDF() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: idFromParams } = useParams();

  const searchParams = new URLSearchParams(location.search);
  const docType = searchParams.get('tipo') || 'factura';
  const isPresupuesto = docType === 'presupuesto';

  const tituloDocumento = isPresupuesto ? 'PRESUPUESTO' : 'FACTURA';
  const chipTexto = isPresupuesto ? 'Documento' : 'Comprobante';
  const textoObservaciones = isPresupuesto
    ? 'Este presupuesto corresponde al servicio de alquiler de vajilla y/o ambientación según condiciones previamente acordadas con el cliente. Para confirmar el pedido se requiere una seña del 20% del total y una garantía reembolsable del 15% (calculada sobre el subtotal de productos), que se hará efectiva al momento del pago.'
    : 'Esta factura corresponde al servicio de alquiler de vajilla y/o ambientación según condiciones previamente acordadas con el cliente. Ante cualquier duda o modificación, contactarse con el equipo de administración.';

  const pedidoFromState = location.state?.pedido || null;

  const pedidoId =
    location.state?.pedidoId ||
    pedidoFromState?.id ||
    idFromParams ||
    null;

  const [pedido, setPedido] = useState(pedidoFromState);
  const [loading, setLoading] = useState(!pedidoFromState && !!pedidoId);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const fetchPedido = async () => {
      if (!pedidoId) return;

      if (pedido && Array.isArray(pedido.detalles) && pedido.detalles.length > 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(`/api/pedidos/${pedidoId}/`);
        setPedido(data);
        setErrMsg('');
      } catch (e) {
        console.error(e);
        setErrMsg('No se pudo cargar el pedido para la factura.');
      } finally {
        setLoading(false);
      }
    };

    fetchPedido();
  }, [pedidoId]);

  const facturaNumero = useMemo(() => {
    if (!pedidoId) return '—';
    return `0001-${String(pedidoId).padStart(8, '0')}`;
  }, [pedidoId]);

  const lineItems = useMemo(() => {
    if (!pedido) return [];
    const detalles = Array.isArray(pedido.detalles) ? pedido.detalles : null;
    const items = Array.isArray(pedido.items) ? pedido.items : null;
    return detalles || items || [];
  }, [pedido]);

  const calcularSubtotalItem = (item) => {
    const qty = item?.cantidad ?? item?.qty ?? 1;
    const unit =
      item?.precio_unitario ??
      item?.precio ??
      item?.precio_unit ??
      item?.importe_unitario ??
      0;
    const subtotal =
      item?.subtotal ??
      item?.precio_total ??
      qty * unit;
    return Number(subtotal || 0);
  };

  const subtotalProductos = useMemo(() => {
    if (lineItems.length === 0) {
      return Number(pedido?.total || 0);
    }
    return lineItems.reduce((acc, it) => acc + calcularSubtotalItem(it), 0);
  }, [lineItems, pedido]);

  const tipoEntrega = pedido?.tipo_entrega || 'retiro';
  const zonaEntrega = pedido?.zona_entrega || '';
  
  useEffect(() => {
    if (pedido) {
      console.log('📦 Datos del pedido:', {
        tipo_entrega: pedido.tipo_entrega,
        zona_entrega: pedido.zona_entrega,
        total: pedido.total
      });
    }
  }, [pedido]);
  
  const costoFlete = useMemo(() => {
    if (tipoEntrega !== 'envio' || !zonaEntrega) {
      console.log('❌ No hay flete:', { tipoEntrega, zonaEntrega });
      return 0;
    }
    const zona = ZONAS_ENTREGA.find(z => z.value === zonaEntrega);
    console.log('✅ Flete encontrado:', zona);
    return zona ? zona.costo : 0;
  }, [tipoEntrega, zonaEntrega]);

  const totalConFlete = subtotalProductos + costoFlete;

  const senia = Number(pedido?.senia || 0);
  const total = Number(pedido?.total || totalConFlete || 0);
  const saldo = total - senia;

  const seniaEstimada = isPresupuesto ? (totalConFlete * SENIA_PORC) / 100 : 0;
  const garantiaEstimada = isPresupuesto ? (subtotalProductos * GARANTIA_PORC) / 100 : 0;

  const fechaEmision = useMemo(
    () => new Date().toLocaleDateString('es-AR'),
    []
  );

  const clienteNombre =
    pedido?.cliente_nombre ||
    pedido?.cliente_data?.nombre ||
    '—';

  const clienteTelefono =
    pedido?.cliente_telefono ||
    pedido?.cliente_data?.telefono ||
    '—';

  const clienteEmail =
    pedido?.cliente_email ||
    pedido?.cliente_data?.email ||
    '—';

  const clienteDomicilio =
    pedido?.cliente_direccion ||
    pedido?.cliente_data?.direccion ||
    pedido?.direccion_evento ||
    '—';

  return (
    <Layout>
      <div
        className="card"
        style={{
          maxWidth: 880,
          margin: '16px auto',
          padding: 24,
          background: '#FFFFFF',
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
          fontFamily:
            `"Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
        }}
      >
        {/* BARRA SUPERIOR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              border: `1px solid ${BORDER}`,
              background: '#FAFAFA',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              border: `1px solid ${GOLD}`,
              background: GOLD_SOFT,
              color: GOLD,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>

        {/* SIN ID DE PEDIDO */}
        {!pedidoId && (
          <div style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>{tituloDocumento}</h2>
            <p className="muted">
              No se encontraron datos del pedido para generar el documento.
            </p>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        {pedidoId && (
          <>
            {errMsg && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: 13,
                }}
              >
                {errMsg}
              </div>
            )}

            {loading && (
              <p
                style={{
                  textAlign: 'center',
                  padding: 20,
                  margin: 0,
                  color: '#9CA3AF',
                }}
              >
                Cargando datos…
              </p>
            )}

            {!loading && pedido && (
              <>
                {/* ENCABEZADO */}
                <header
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 20,
                    alignItems: 'flex-start',
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 18,
                    background:
                      'linear-gradient(120deg, #FFFFFF 0%, #FFF7EC 45%, #FFFFFF 100%)',
                    border: `1px solid ${GOLD_SOFT}`,
                  }}
                >
                  {/* Logo + empresa */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        border: `1px solid ${BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#FFFFFF',
                      }}
                    >
                      <img
                        src={logo}
                        alt="Logo"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: 20,
                          letterSpacing: 0.4,
                          fontWeight: 700,
                          color: '#1F2933',
                        }}
                      >
                        Hollywood Producciones
                      </h1>
                      <p
                        style={{
                          margin: '3px 0',
                          fontSize: 12,
                          color: '#6B7280',
                        }}
                      >
                        Servicios de alquiler de vajilla y ambientaciones
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: '#9CA3AF',
                        }}
                      >
                        CUIT: 30-00000000-0 · Av. Siempre Viva 123 · Salta, Argentina
                      </p>
                    </div>
                  </div>

                  {/* Datos documento */}
                  <div
                    style={{
                      textAlign: 'right',
                      minWidth: 210,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 1.3,
                        color: GOLD,
                        marginBottom: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#FFFDF8',
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1px solid ${GOLD_SOFT}`,
                      }}
                    >
                      <FileText size={14} />
                      {chipTexto}
                    </div>
                    <h2
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#111827',
                      }}
                    >
                      {tituloDocumento}
                    </h2>
                    <p
                      style={{
                        margin: '2px 0',
                        fontSize: 13,
                        color: '#4B5563',
                      }}
                    >
                      N.º <strong>{facturaNumero}</strong>
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#6B7280',
                      }}
                    >
                      Fecha de emisión: {fechaEmision}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#9CA3AF',
                      }}
                    >
                      Pedido asociado: #{pedidoId}
                    </p>
                  </div>
                </header>

                {/* BLOQUE CLIENTE + EVENTO */}
                <section
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1.1fr',
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  {/* Cliente */}
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: `1px solid ${BORDER}`,
                      background: '#FAFAFA',
                      fontSize: 13,
                    }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: 6,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: '#6B7280',
                      }}
                    >
                      Datos del cliente
                    </h3>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Nombre:</strong> {clienteNombre}
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Teléfono:</strong> {clienteTelefono}
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Email:</strong> {clienteEmail}
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Domicilio:</strong> {clienteDomicilio}
                    </p>
                  </div>

                  {/* Evento */}
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: `1px solid ${BORDER}`,
                      background: '#FFFFFF',
                      fontSize: 13,
                    }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: 6,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: '#6B7280',
                      }}
                    >
                      Detalles del evento
                    </h3>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Fecha del evento:</strong>{' '}
                      {pedido?.fecha_hora_evento
                        ? new Date(pedido.fecha_hora_evento).toLocaleDateString(
                            'es-AR'
                          )
                        : '—'}
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Fecha de devolución:</strong>{' '}
                      {pedido?.fecha_hora_devolucion
                        ? new Date(
                            pedido.fecha_hora_devolucion
                          ).toLocaleDateString('es-AR')
                        : '—'}
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Tipo de servicio:</strong>{' '}
                      <span style={{ textTransform: 'capitalize' }}>
                        {tipoEntrega === 'envio' ? 'Entrega' : 'Retiro'}
                      </span>
                    </p>
                    <p style={{ margin: '2px 0' }}>
                      <strong>Estado del pedido:</strong>{' '}
                      <span style={{ textTransform: 'capitalize' }}>
                        {pedido?.estado || '—'}
                      </span>
                    </p>
                  </div>
                </section>

                {/* TABLA DE PRODUCTOS */}
                <section style={{ marginBottom: 18 }}>
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: 10,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: '#6B7280',
                    }}
                  >
                    Detalle de productos / servicios
                  </h3>

                  <div
                    style={{
                      borderRadius: 8,
                      border: `1px solid ${BORDER}`,
                      overflow: 'hidden',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 12,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: GOLD_SOFT,
                            color: '#374151',
                            textAlign: 'left',
                            borderBottom: `1px solid ${BORDER}`,
                          }}
                        >
                          <th style={{ padding: '8px 10px', width: 40 }}>#</th>
                          <th style={{ padding: '8px 10px' }}>Descripción</th>
                          <th
                            style={{
                              padding: '8px 10px',
                              textAlign: 'center',
                              width: 60,
                            }}
                          >
                            Cant.
                          </th>
                          <th
                            style={{
                              padding: '8px 10px',
                              textAlign: 'right',
                              width: 110,
                            }}
                          >
                            Precio unitario
                          </th>
                          <th
                            style={{
                              padding: '8px 10px',
                              textAlign: 'right',
                              width: 120,
                            }}
                          >
                            Importe
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.length > 0 ? (
                          lineItems.map((item, idx) => {
                            const qty = item?.cantidad ?? item?.qty ?? 1;
                            const unit =
                              item?.precio_unitario ??
                              item?.precio ??
                              item?.precio_unit ??
                              item?.importe_unitario ??
                              0;
                            const subtotal = calcularSubtotalItem(item);
                            const descripcion =
                              item?.producto_nombre ??
                              item?.producto ??
                              item?.descripcion ??
                              'Producto / servicio';

                            return (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: `1px solid ${BORDER}`,
                                  background:
                                    idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                                }}
                              >
                                <td style={{ padding: '6px 10px' }}>{idx + 1}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  {descripcion}
                                </td>
                                <td
                                  style={{
                                    padding: '6px 10px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {qty}
                                </td>
                                <td
                                  style={{
                                    padding: '6px 10px',
                                    textAlign: 'right',
                                  }}
                                >
                                  {money(unit)}
                                </td>
                                <td
                                  style={{
                                    padding: '6px 10px',
                                    textAlign: 'right',
                                  }}
                                >
                                  {money(subtotal)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                padding: '10px 10px',
                                textAlign: 'center',
                                color: '#9CA3AF',
                                fontStyle: 'italic',
                              }}
                            >
                              El detalle de ítems no está disponible en este
                              momento.
                            </td>
                          </tr>
                        )}

                        {/* Fila de FLETE */}
                        {tipoEntrega === 'envio' && costoFlete > 0 && (
                          <tr
                            style={{
                              borderBottom: `1px solid ${BORDER}`,
                              background: '#F0F4FF',
                            }}
                          >
                            <td style={{ padding: '6px 10px' }}>
                              <Truck size={14} color="#4338ca" />
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                              Flete - {zonaEntrega || 'Entrega a domicilio'}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                textAlign: 'center',
                              }}
                            >
                              1
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                textAlign: 'right',
                              }}
                            >
                              {money(costoFlete)}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: '#4338ca',
                              }}
                            >
                              {money(costoFlete)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* TOTALES + SELLO DIGITAL */}
                <section
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 18,
                    marginBottom: 24,
                  }}
                >
                  {/* Observaciones */}
                  <div>
                    <h4
                      style={{
                        marginTop: 0,
                        marginBottom: 8,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: '#6B7280',
                      }}
                    >
                      Observaciones
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#6B7280',
                        lineHeight: 1.6,
                      }}
                    >
                      {textoObservaciones}
                    </p>

                    {/* Condiciones económicas en PRESUPUESTO (abajo de observaciones) */}
                    {isPresupuesto && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: '12px 14px',
                          background: '#FFFBF5',
                          border: '1.5px dashed #C19A6B',
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#92400E',
                            marginBottom: 8,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          📋 Condiciones económicas
                        </div>
                        <div style={{ color: '#78350F', lineHeight: 1.6 }}>
                          <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                            <span>• Seña requerida (20%):</span>
                            <strong>{money(seniaEstimada)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>• Garantía (15% s/productos):</span>
                            <strong>{money(garantiaEstimada)}</strong>
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                              paddingTop: 8,
                              borderTop: '1px solid #FDE68A',
                              fontSize: 10,
                              color: '#92400E',
                              fontStyle: 'italic',
                            }}
                          >
                            La garantía es reembolsable y se calcula solo sobre productos (sin flete).
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Totales y Sello */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isPresupuesto ? '1fr' : '1fr 280px',
                      gap: 20,
                      alignItems: 'start',
                    }}
                  >
                    {/* Cuadro de Totales */}
                    <div
                      style={{
                        borderRadius: 12,
                        border: `2px solid ${GOLD}`,
                        background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFEF8 100%)',
                        padding: '18px 20px',
                        fontSize: 12,
                        lineHeight: 1.6,
                        boxShadow: '0 2px 8px rgba(193, 154, 107, 0.15)',
                      }}
                    >
                      {/* Título del cuadro */}
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 1.2,
                          color: GOLD,
                          fontWeight: 700,
                          marginBottom: 14,
                          paddingBottom: 10,
                          borderBottom: `2px solid ${GOLD_SOFT}`,
                        }}
                      >
                        {isPresupuesto ? 'Resumen del presupuesto' : 'Resumen de pagos'}
                      </div>

                      {/* Subtotal productos */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                          padding: '4px 0',
                        }}
                      >
                        <span style={{ color: '#6B7280', fontWeight: 500, fontSize: 12 }}>
                          Subtotal productos
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                          {money(subtotalProductos)}
                        </span>
                      </div>

                      {/* Mostrar flete si aplica */}
                      {tipoEntrega === 'envio' && costoFlete > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                            padding: '4px 0',
                          }}
                        >
                          <span style={{ 
                            color: '#4338ca', 
                            fontWeight: 500,
                            fontSize: 12,
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6 
                          }}>
                            <Truck size={14} />
                            Flete - {zonaEntrega}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#4338ca' }}>
                            {money(costoFlete)}
                          </span>
                        </div>
                      )}

                      {/* Línea divisoria antes del total */}
                      <div
                        style={{
                          height: 2,
                          background: `linear-gradient(to right, ${GOLD}, ${GOLD_SOFT})`,
                          margin: '12px 0',
                        }}
                      />

                      {/* Total del servicio */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 14px',
                          background: GOLD_SOFT,
                          borderRadius: 8,
                          marginBottom: isPresupuesto ? 0 : 16,
                        }}
                      >
                        <span style={{ 
                          color: '#111827',
                          fontWeight: 700,
                          fontSize: 14 
                        }}>
                          Total del servicio
                        </span>
                        <span style={{ 
                          color: GOLD,
                          fontWeight: 800,
                          fontSize: 18 
                        }}>
                          {money(isPresupuesto ? totalConFlete : total)}
                        </span>
                      </div>

                      {/* Solo en FACTURA: mostrar seña y saldo */}
                      {!isPresupuesto && (
                        <>
                          <div
                            style={{
                              height: 1,
                              background: '#E5E7EB',
                              margin: '14px 0',
                            }}
                          />

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8,
                              padding: '4px 0',
                            }}
                          >
                            <span style={{ 
                              color: '#6B7280',
                              fontWeight: 500,
                              fontSize: 12 
                            }}>
                              Seña pagada:
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#059669' }}>
                              {money(senia)}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: saldo > 0 ? '#FEF3C7' : '#D1FAE5',
                              borderRadius: 8,
                            }}
                          >
                            <span style={{ 
                              fontWeight: 600,
                              fontSize: 12,
                              color: saldo > 0 ? '#92400E' : '#065F46'
                            }}>
                              Saldo pendiente:
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: saldo > 0 ? '#B45309' : '#059669',
                              }}
                            >
                              {money(saldo >= 0 ? saldo : 0)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* SELLO DIGITAL - Solo en FACTURA */}
                    {!isPresupuesto && (
                      <div
                        style={{
                          borderRadius: 12,
                          border: `2px solid ${GOLD}`,
                          background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF7EC 100%)',
                          padding: '24px 20px',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 12,
                          boxShadow: '0 4px 12px rgba(193, 154, 107, 0.2)',
                          minHeight: 200,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            color: '#9CA3AF',
                            fontWeight: 600,
                          }}
                        >
                          Sello digital
                        </span>

                        <div
                          style={{
                            borderRadius: '50%',
                            border: `3px solid ${GOLD}`,
                            padding: '20px 24px',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 1.2,
                            color: GOLD,
                            background: '#FFFFFF',
                            boxShadow: '0 3px 10px rgba(193, 154, 107, 0.25)',
                            lineHeight: 1.3,
                          }}
                        >
                          Hollywood<br />
                          Producciones
                        </div>

                        <span
                          style={{
                            fontSize: 9,
                            color: '#9CA3AF',
                            lineHeight: 1.4,
                            maxWidth: '85%',
                          }}
                        >
                          Comprobante generado digitalmente
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* FOOTER */}
                <footer
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    paddingTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    fontSize: 11,
                    color: '#9CA3AF',
                  }}
                >
                  <div>
                    <p style={{ margin: 0 }}>
                      Gracias por confiar en{' '}
                      <strong>Hollywood Producciones</strong>.
                    </p>
                    <p style={{ margin: '2px 0 0 0' }}>
                      Este comprobante no requiere firma manuscrita para su
                      validez.
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 200 }}>
                    <div
                      style={{
                        borderBottom: `1px solid ${GOLD}`,
                        marginBottom: 4,
                        marginTop: 12,
                      }}
                    />
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        color: '#4B5563',
                      }}
                    >
                      Responsable de facturación
                    </p>
                    <p style={{ margin: 0 }}>Hollywood Producciones</p>
                  </div>
                </footer>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}









