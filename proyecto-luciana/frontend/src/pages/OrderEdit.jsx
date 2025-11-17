import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft, ExternalLink, Truck, Store, MapPin } from 'lucide-react';
import { confirm, error, success } from './alerts';

const GOLD = '#FFD700';

const toAbs = (p) => {
  if (!p) return '';
  try {
    const base = (axios.defaults.baseURL || '').replace(/\/api\/?$/, '/');
    return p.startsWith('http') ? p : new URL(p, base).toString();
  } catch {
    return p;
  }
};

export default function OrderEdit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [estado, setEstado] = useState('pendiente');
  const [evento, setEvento] = useState('');
  const [devolucion, setDevolucion] = useState('');
  const [senia, setSenia] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccionEvento, setDireccionEvento] = useState('');
  const [referenciaEntrega, setReferenciaEntrega] = useState('');
  const [comprobantePreview, setComprobantePreview] = useState('');
  const [comprobanteNew, setComprobanteNew] = useState(null);
  const [garantiaTipo, setGarantiaTipo] = useState('dni');
  const [garantiaEstado, setGarantiaEstado] = useState('pendiente');
  const [garantiaMonto, setGarantiaMonto] = useState('');
  const [garantiaDesc, setGarantiaDesc] = useState('');
  const [garantiaMotivo, setGarantiaMotivo] = useState('');
  const [garantiaPreview, setGarantiaPreview] = useState('');
  const [garantiaNew, setGarantiaNew] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [errs, setErrs] = useState({});
  const [initialData, setInitialData] = useState(null);

  const toLocalInput = (iso) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res1, res2, res3] = await Promise.all([
          axios.get('/api/clientes/'),
          axios.get('/api/productos/'),
          axios.get(`/api/pedidos/${id}/`),
        ]);

        const cl = res1.data;
        const pr = res2.data;
        const pe = res3.data;

        setClientes(Array.isArray(cl) ? cl : cl.results || []);
        setProductos(Array.isArray(pr) ? pr : pr.results || []);

        const cid = pe?.cliente?.id ?? pe?.cliente ?? '';
        const estadoVal = String(pe?.estado || 'pendiente');
        const eventoVal = toLocalInput(pe?.fecha_hora_evento);
        const devolucionVal = toLocalInput(pe?.fecha_hora_devolucion);
        const seniaVal = pe?.senia != null ? String(pe.senia) : '';
        const formaPagoVal = pe?.forma_pago || 'efectivo';
        const tipoEntregaVal = pe?.tipo_entrega || 'retiro';
        const direccionEventoVal = pe?.direccion_evento || '';
        const referenciaEntregaVal = pe?.referencia_entrega || '';

        setClienteId(String(cid || ''));
        setEstado(estadoVal);
        setEvento(eventoVal);
        setDevolucion(devolucionVal);
        setSenia(seniaVal);
        setFormaPago(formaPagoVal);
        setTipoEntrega(tipoEntregaVal);
        setDireccionEvento(direccionEventoVal);
        setReferenciaEntrega(referenciaEntregaVal);

        const compAbs = toAbs(pe?.comprobante_file || pe?.comprobante_url);
        setComprobantePreview(compAbs || '');
        setComprobanteNew(null);

        const garantiaTipoVal = pe?.garantia_tipo || 'dni';
        const garantiaEstadoVal = pe?.garantia_estado || 'pendiente';
        const garantiaMontoVal = pe?.garantia_monto != null ? String(pe.garantia_monto) : '';
        const garantiaDescVal = pe?.garantia_descuento != null ? String(pe?.garantia_descuento) : '';
        const garantiaMotivoVal = pe?.garantia_motivo || '';

        setGarantiaTipo(garantiaTipoVal);
        setGarantiaEstado(garantiaEstadoVal);
        setGarantiaMonto(garantiaMontoVal);
        setGarantiaDesc(garantiaDescVal);
        setGarantiaMotivo(garantiaMotivoVal);

        let gFile = '';
        if (pe?.garantia_tipo === 'servicio') {
          gFile = pe?.garantia_serv_file || pe?.garantia_serv_url;
        } else if (pe?.garantia_tipo === 'otro') {
          gFile = pe?.garantia_otro_file || pe?.garantia_otro_url;
        } else {
          gFile = pe?.garantia_dni_file || pe?.garantia_dni_url;
        }

        setGarantiaPreview(toAbs(gFile) || '');
        setGarantiaNew(null);

        const det = Array.isArray(pe?.detalles) ? pe.detalles : [];
        setItems(
          det.map((d) => ({
            producto: Number(d?.producto?.id ?? d?.producto ?? null),
            producto_nombre: d?.producto_nombre || '',
            cantidad: String(d?.cantidad ?? '1'),
            precio_unit: String(d?.precio_unit ?? ''),
          }))
        );

        setInitialData({
          estado: estadoVal,
          evento: eventoVal,
          devolucion: devolucionVal,
          senia: seniaVal,
          formaPago: formaPagoVal,
          tipoEntrega: tipoEntregaVal,
          direccionEvento: direccionEventoVal,
          referenciaEntrega: referenciaEntregaVal,
          garantiaTipo: garantiaTipoVal,
          garantiaEstado: garantiaEstadoVal,
          garantiaMonto: garantiaMontoVal,
          garantiaDesc: garantiaDescVal,
          garantiaMotivo: garantiaMotivoVal,
          comprobantePreview: compAbs || '',
          garantiaPreview: toAbs(gFile) || '',
        });
      } catch (e) {
        setMsg('Error al cargar los datos del pedido.');
        error({ title: 'No se pudo cargar', message: 'Reintentá más tarde.' });
      }
    };
    loadData();
  }, [id]);

  const isModified = useMemo(() => {
    if (!initialData) return false;
    return (
      estado !== initialData.estado ||
      evento !== initialData.evento ||
      devolucion !== initialData.devolucion ||
      senia !== initialData.senia ||
      formaPago !== initialData.formaPago ||
      tipoEntrega !== initialData.tipoEntrega ||
      direccionEvento !== initialData.direccionEvento ||
      referenciaEntrega !== initialData.referenciaEntrega ||
      garantiaTipo !== initialData.garantiaTipo ||
      garantiaEstado !== initialData.garantiaEstado ||
      garantiaMonto !== initialData.garantiaMonto ||
      garantiaDesc !== initialData.garantiaDesc ||
      garantiaMotivo !== initialData.garantiaMotivo ||
      comprobanteNew !== null ||
      garantiaNew !== null
    );
  }, [
    initialData,
    estado,
    evento,
    devolucion,
    senia,
    formaPago,
    tipoEntrega,
    direccionEvento,
    referenciaEntrega,
    garantiaTipo,
    garantiaEstado,
    garantiaMonto,
    garantiaDesc,
    garantiaMotivo,
    comprobanteNew,
    garantiaNew,
  ]);

  const handleBack = async () => {
    if (!isModified) {
      navigate('/pedidos');
      return;
    }
    const ok = await confirm({
      title: 'Tenés cambios sin guardar',
      message:
        'Si salís ahora, las modificaciones realizadas se van a perder.\n\n¿Seguro que querés volver a pedidos?',
      okText: 'Salir igualmente',
      cancelText: 'Cancelar',
      tone: 'warn',
    });
    if (ok) navigate('/pedidos');
  };

  const validate = () => {
    const e = {};
    if (!evento) e.evento = 'Indicá fecha/hora del evento.';
    if (!devolucion) e.devolucion = 'Indicá fecha/hora de devolución.';
    if (evento && devolucion) {
      const ev = new Date(evento);
      const dev = new Date(devolucion);
      if (dev <= ev) e.devolucion = 'La devolución debe ser posterior al evento.';
    }
    if (tipoEntrega === 'envio' && !direccionEvento.trim()) {
      e.direccion_evento = 'Indicá la dirección de entrega.';
    }
    if (garantiaMonto !== '' && Number(garantiaMonto) < 0) {
      e.garantia_monto = 'La garantía no puede ser negativa.';
    }
    if (garantiaEstado === 'descontada') {
      if (garantiaDesc === '' || Number(garantiaDesc) < 0) {
        e.garantia_desc = 'Indicá el monto descontado (>= 0).';
      }
    }
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    const eCab = validate();
    setErrs(eCab);
    if (Object.keys(eCab).length) {
      setMsg('Por favor corregí los errores marcados.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      const base = {
        estado,
        fecha_hora_evento: new Date(evento).toISOString(),
        fecha_hora_devolucion: new Date(devolucion).toISOString(),
        senia: Number(senia || 0),
        forma_pago: formaPago || '',
        tipo_entrega: tipoEntrega,
        direccion_evento: tipoEntrega === 'envio' ? direccionEvento : '',
        referencia_entrega: tipoEntrega === 'envio' ? referenciaEntrega : '',
        garantia_monto: garantiaMonto === '' ? 0 : Number(garantiaMonto),
        garantia_tipo: garantiaTipo,
        garantia_estado: garantiaEstado,
        garantia_descuento:
          garantiaEstado === 'descontada' ? Number(garantiaDesc || 0) : undefined,
        garantia_motivo: garantiaEstado === 'descontada' ? garantiaMotivo || '' : '',
      };

      const hasFiles = Boolean(comprobanteNew || garantiaNew);

      if (hasFiles) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => {
          if (v === undefined) return;
          fd.append(k, String(v));
        });
        if (comprobanteNew) fd.append('comprobante_file', comprobanteNew);
        if (garantiaNew) {
          if (garantiaTipo === 'dni') fd.append('garantia_dni_file', garantiaNew);
          else if (garantiaTipo === 'servicio') fd.append('garantia_serv_file', garantiaNew);
          else fd.append('garantia_otro_file', garantiaNew);
        }
        await axios.patch(`/api/pedidos/${id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.patch(`/api/pedidos/${id}/`, base);
      }

      await success({
        title: 'Cambios guardados',
        message: `Se actualizó el pedido #${id}.`,
      });
      navigate('/pedidos', { replace: true, state: { updatedId: id } });
    } catch (err) {
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo actualizar el pedido. ${m}`);
      error({ title: 'No se pudo actualizar', message: m });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
                color: '#475569',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              <ArrowLeft size={16} />
              Volver a pedidos
            </button>

            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              Editar pedido
            </h1>
          </div>

          {msg && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                fontSize: 13,
                color: '#b91c1c',
              }}
            >
              {msg}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 10px 25px rgba(15,23,42,0.05)',
                border: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Datos del pedido
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
                Cliente asociado y estado general.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Cliente
                  </label>
                  <select
                    value={clienteId}
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                      color: '#0f172a',
                      background: '#f9fafb',
                    }}
                  >
                    <option value="">— Seleccionar cliente —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellido} {c.documento ? `(${c.documento})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                      color: '#0f172a',
                    }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="entregado">Entregado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Fecha y hora del evento
                  </label>
                  <input
                    type="datetime-local"
                    value={evento}
                    onChange={(e) => setEvento(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: errs.evento ? '2px solid #f97373' : '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  />
                  {errs.evento && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#f97373' }}>{errs.evento}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Fecha y hora de devolución
                  </label>
                  <input
                    type="datetime-local"
                    value={devolucion}
                    onChange={(e) => setDevolucion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: errs.devolucion ? '2px solid #f97373' : '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  />
                  {errs.devolucion && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#f97373' }}>{errs.devolucion}</div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 10px 25px rgba(15,23,42,0.05)',
                border: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Tipo de servicio y entrega
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
                Seleccioná si el cliente retira o se le entrega a domicilio.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div
                  onClick={() => setTipoEntrega('retiro')}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: tipoEntrega === 'retiro' ? '3px solid #10b981' : '2px solid #e2e8f0',
                    background: tipoEntrega === 'retiro' ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Store size={28} color={tipoEntrega === 'retiro' ? '#10b981' : '#94a3b8'} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: tipoEntrega === 'retiro' ? '#10b981' : '#1e293b' }}>
                    RETIRO
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                    Cliente retira en el local
                  </div>
                </div>

                <div
                  onClick={() => setTipoEntrega('envio')}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: tipoEntrega === 'envio' ? '3px solid #667eea' : '2px solid #e2e8f0',
                    background: tipoEntrega === 'envio' ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Truck size={28} color={tipoEntrega === 'envio' ? '#667eea' : '#94a3b8'} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: tipoEntrega === 'envio' ? '#667eea' : '#1e293b' }}>
                    ENTREGA
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                    Llevamos al domicilio del cliente
                  </div>
                </div>
              </div>

              {tipoEntrega === 'envio' && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: '#f0f4ff',
                    borderRadius: 12,
                    border: '2px solid rgba(102, 126, 234, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <MapPin size={18} color="#667eea" />
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#667eea' }}>
                      Dirección de entrega
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Dirección (calle y número)
                      </label>
                      <input
                        type="text"
                        value={direccionEvento}
                        onChange={(e) => setDireccionEvento(e.target.value)}
                        placeholder="Ej: Belgrano 951"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: errs.direccion_evento ? '2px solid #f97373' : '2px solid #e2e8f0',
                          outline: 'none',
                          fontSize: 14,
                        }}
                      />
                      {errs.direccion_evento && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#f97373' }}>{errs.direccion_evento}</div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Referencia adicional (opcional)
                      </label>
                      <input
                        type="text"
                        value={referenciaEntrega}
                        onChange={(e) => setReferenciaEntrega(e.target.value)}
                        placeholder="Ej: Casa con portón verde, timbre 2B"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '2px solid #e2e8f0',
                          outline: 'none',
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 10px 25px rgba(15,23,42,0.05)',
                border: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Pago y seña
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
                Forma de pago y comprobante de seña.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Forma de pago
                  </label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Monto de seña
                  </label>
                  <input
                    type="number"
                    value={senia}
                    onChange={(e) => setSenia(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                  Comprobante de seña
                </label>

                {comprobantePreview && !comprobanteNew && (
                  <div style={{ marginBottom: 12 }}>
                    
                      href={comprobantePreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        fontSize: 13,
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    
                      <ExternalLink size={14} />
                      Ver comprobante actual
                  
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setComprobanteNew(file);
                  }}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '2px dashed #e2e8f0',
                    fontSize: 13,
                  }}
                />
                {comprobanteNew && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#10b981' }}>
                    ✓ Nuevo archivo seleccionado: {comprobanteNew.name}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 10px 25px rgba(15,23,42,0.05)',
                border: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: '0 0 4px 0', fontSize : 16, fontWeight: 700, color: '#0f172a' }}>
                Garantía
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
                Tipo de garantía, monto y estado.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Tipo de garantía
                  </label>
                  <select
                    value={garantiaTipo}
                    onChange={(e) => setGarantiaTipo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  >
                    <option value="dni">DNI</option>
                    <option value="servicio">Servicio</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Estado de garantía
                  </label>
                  <select
                    value={garantiaEstado}
                    onChange={(e) => setGarantiaEstado(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="recibida">Recibida</option>
                    <option value="devuelta">Devuelta</option>
                    <option value="descontada">Descontada</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Monto de garantía
                  </label>
                  <input
                    type="number"
                    value={garantiaMonto}
                    onChange={(e) => setGarantiaMonto(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: errs.garantia_monto ? '2px solid #f97373' : '2px solid #e2e8f0',
                      fontSize: 14,
                    }}
                  />
                  {errs.garantia_monto && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#f97373' }}>{errs.garantia_monto}</div>
                  )}
                </div>
              </div>

              {garantiaEstado === 'descontada' && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: '#fef3c7',
                    borderRadius: 12,
                    border: '2px solid rgba(251, 191, 36, 0.25)',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                        Monto descontado
                      </label>
                      <input
                        type="number"
                        value={garantiaDesc}
                        onChange={(e) => setGarantiaDesc(e.target.value)}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: errs.garantia_desc ? '2px solid #f97373' : '2px solid #fbbf24',
                          outline: 'none',
                          fontSize: 14,
                          background: 'white',
                        }}
                      />
                      {errs.garantia_desc && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#f97373' }}>{errs.garantia_desc}</div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                        Motivo del descuento
                      </label>
                      <input
                        type="text"
                        value={garantiaMotivo}
                        onChange={(e) => setGarantiaMotivo(e.target.value)}
                        placeholder="Ej: Producto dañado"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '2px solid #fbbf24',
                          outline: 'none',
                          fontSize: 14,
                          background: 'white',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                  Archivo de garantía ({garantiaTipo.toUpperCase()})
                </label>

                {garantiaPreview && !garantiaNew && (
                  <div style={{ marginBottom: 12 }}>
                    
                      href={garantiaPreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        fontSize: 13,
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    
                      <ExternalLink size={14} />
                      Ver archivo actual
                    
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setGarantiaNew(file);
                  }}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '2px dashed #e2e8f0',
                    fontSize: 13,
                  }}
                />
                {garantiaNew && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#10b981' }}>
                    ✓ Nuevo archivo seleccionado: {garantiaNew.name}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 10px 25px rgba(15,23,42,0.05)',
                border: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Productos del pedido
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#64748b' }}>
                Listado de productos (no se pueden editar desde aquí).
              </p>

              {items.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No hay productos en este pedido
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {items.map((item, idx) => {
                    const prod = productos.find((p) => p.id === item.producto);
                    const nombre = prod?.nombre || item.producto_nombre || 'Sin nombre';
                    const precio = parseFloat(item.precio_unit || 0);
                    const cantidad = parseInt(item.cantidad || 1, 10);
                    const subtotal = precio * cantidad;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#f9fafb',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                            {nombre}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Cantidad: {cantidad} × ${precio.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <button
                type="submit"
                disabled={saving || !isModified}
                style={{
                  padding: '12px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  background: isModified ? '#c9a961' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  cursor: saving || !isModified ? 'not-allowed' : 'pointer',
                  opacity: saving || !isModified ? 0.6 : 1,
                  boxShadow: isModified ? '0 10px 25px rgba(201,169,97,0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {saving ? '⏳ Guardando...' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                onClick={handleBack}
                style={{
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 500,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}


