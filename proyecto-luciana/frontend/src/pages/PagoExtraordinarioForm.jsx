import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../api/axios";
import Layout from "../components/Layout";
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Package,
  Users,
  Wrench,
  Server,
  Plus,
  Minus,
  Building2,
  MessageCircle
} from 'lucide-react';

const tiposExtraordinarios = [
  { value: "COMPRA_INSUMOS", label: "Compra de insumos", sentido: "EGRESO", icon: Package, color: "#f97316" },
  { value: "PAGO_TRABAJADORES", label: "Pago a trabajadores", sentido: "EGRESO", icon: Users, color: "#f59e0b" },
  { value: "SERVICIOS", label: "Servicios", sentido: "EGRESO", icon: Server, color: "#ec4899" },
  { value: "MANTENIMIENTO", label: "Mantenimiento", sentido: "EGRESO", icon: Wrench, color: "#8b5cf6" },
  { value: "OTRO_INGRESO", label: "Otro ingreso", sentido: "INGRESO", icon: Plus, color: "#10b981" },
  { value: "OTRO_EGRESO", label: "Otro egreso", sentido: "EGRESO", icon: Minus, color: "#ef4444" },
];

const CUENTAS_BANCARIAS = [
  {
    id: 1,
    banco: "Banco Naranja X",
    alias: "Bri1925",
    cbu: "4530000800017698619478",
    titular: "Brisa Itzel Michel",
    color: "#ff6b00"
  },
  {
    id: 2,
    banco: "Banco Macro",
    alias: "MACRO.BRISA",
    cbu: "2850590940090418420001",
    titular: "Brisa Itzel Michel",
    color: "#0066cc"
  }
];

const WHATSAPP_NUMBER = "543875130659";

function PagoExtraordinarioForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [loadingCaja, setLoadingCaja] = useState(false);

  const tipoPagoInicial = location.state?.tipo_pago_inicial || "COMPRA_INSUMOS";

  const [form, setForm] = useState({
    tipo_pago: tipoPagoInicial,
    monto: "",
    metodo_pago: "EFECTIVO",
    comprobante_pago: "",
    notas: "",
    descripcion: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerCajaAbierta();
  }, []);

  async function obtenerCajaAbierta() {
    setLoadingCaja(true);
    try {
      const res = await axios.get("/api/cajas/caja_abierta/");
      setCajaAbierta(res.data);
    } catch (err) {
      console.log("No hay caja abierta");
      setCajaAbierta(null);
    } finally {
      setLoadingCaja(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function getSentidoActual() {
    const tipo = tiposExtraordinarios.find(t => t.value === form.tipo_pago);
    return tipo?.sentido || "EGRESO";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.monto || Number(form.monto) <= 0) {
      setError("El monto debe ser mayor a cero.");
      return;
    }

    if (!form.descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }

    const sentido = getSentidoActual();

    const payload = {
      tipo_pago: form.tipo_pago,
      monto: Number(form.monto),
      metodo_pago: form.metodo_pago,
      comprobante_pago: form.comprobante_pago || "",
      notas: form.notas || "",
      sentido: sentido,
      caja: cajaAbierta?.id_caja || null,
    };

    setSaving(true);
    try {
      await axios.post("/api/pagos/", payload);
      navigate("/pagos");
    } catch (err) {
      console.error(err);
      const apiMsg = err.response?.data?.detail || 
                     err.response?.data?.non_field_errors?.[0];
      setError(apiMsg || "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  }

  function copiarTexto(texto) {
    navigator.clipboard.writeText(texto);
  }

  function enviarWhatsApp() {
    const tipoLabel = tiposExtraordinarios.find(t => t.value === form.tipo_pago)?.label || form.tipo_pago;
    const mensaje = `Hola! Necesito enviar un comprobante de pago. \n\nTipo: ${tipoLabel}\nDescripción: ${form.descripcion}\nMonto: $${form.monto}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  const sentidoActual = getSentidoActual();
  const tipoSeleccionado = tiposExtraordinarios.find(t => t.value === form.tipo_pago);
  const IconoTipo = tipoSeleccionado?.icon || Package;

  return (
    <Layout title="Registrar Pago Extraordinario">
      <div className="ent-card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button 
            onClick={() => navigate("/pagos")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: 16,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <ArrowLeft size={18} />
            Volver a pagos
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 8, color: '#1e293b' }}>
                Registrar Pago Extraordinario
              </h2>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
                Pagos no asociados a alquileres (insumos, servicios, mantenimiento, etc.)
              </p>
            </div>

            {/* Estado de caja */}
            {loadingCaja ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: '#f8fafc',
                borderRadius: 8,
                fontSize: 13,
                color: '#64748b'
              }}>
                <Loader2 size={16} className="spin" />
                Verificando caja...
              </div>
            ) : cajaAbierta ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#059669'
              }}>
                <CheckCircle2 size={16} />
                Caja #{cajaAbierta.id_caja} - {cajaAbierta.empleado_nombre}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#dc2626'
              }}>
                <AlertCircle size={16} />
                No hay caja abierta
              </div>
            )}
          </div>
        </div>

        {/* Alerta de caja cerrada */}
        {!cajaAbierta && !loadingCaja && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12
          }}>
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                Caja cerrada
              </div>
              <div style={{ fontSize: 14, color: '#7f1d1d' }}>
                Necesitás abrir una caja desde <strong>Gestión de Caja</strong> para poder registrar pagos.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Tipo de movimiento - SOLO VISUALIZACIÓN */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                background: tipoSeleccionado?.color || '#667eea',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconoTipo size={24} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                  {tipoSeleccionado?.label}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Tipo de movimiento seleccionado
                </p>
              </div>
            </div>

            {/* Indicador visual del sentido */}
            <div style={{ 
              padding: 20,
              background: sentidoActual === 'INGRESO' ? '#ecfdf5' : '#fef2f2',
              border: sentidoActual === 'INGRESO' ? '1px solid #a7f3d0' : '1px solid #fecaca',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{
                width: 48,
                height: 48,
                background: sentidoActual === 'INGRESO' ? '#10b981' : '#ef4444',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {sentidoActual === 'INGRESO' ? '↑' : '↓'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700,
                  color: sentidoActual === 'INGRESO' ? '#059669' : '#dc2626',
                  marginBottom: 4
                }}>
                  {sentidoActual}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {sentidoActual === 'INGRESO' 
                    ? 'Este movimiento sumará dinero a caja'
                    : 'Este movimiento restará dinero de caja'
                  }
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div style={{ marginTop: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                marginBottom: 8
              }}>
                Descripción del movimiento <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MessageSquare size={18} style={{
                  position: 'absolute',
                  left: 12,
                  top: 12,
                  color: '#cbd5e1',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  name="descripcion"
                  placeholder="Ej: Compra de cables y luces LED"
                  value={form.descripcion}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    fontSize: 14,
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: 'white',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = tipoSeleccionado?.color || '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <small style={{ display: 'block', marginTop: 6, color: '#94a3b8', fontSize: 12 }}>
                Detallá brevemente el concepto del pago
              </small>
            </div>
          </div>

          {/* Detalles del Pago */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                background: '#667eea',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={24} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                  Detalles del Pago
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Especificá el monto y forma de pago
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20
            }}>
              {/* Monto */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 8
                }}>
                  Monto <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#cbd5e1',
                    zIndex: 1
                  }}>
                    $
                  </span>
                  <input
                    type="number"
                    name="monto"
                    step="0.01"
                    value={form.monto}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 32px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1e293b',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      background: 'white',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              {/* Método - SOLO EFECTIVO Y TRANSFERENCIA */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 8
                }}>
                  Método de pago
                </label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={18} style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#cbd5e1',
                    zIndex: 1
                  }} />
                  <select
                    name="metodo_pago"
                    value={form.metodo_pago}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#1e293b',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      background: 'white',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>
              </div>

              {/* Referencia */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 8
                }}>
                  Comprobante / Referencia
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={18} style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#cbd5e1',
                    zIndex: 1
                  }} />
                  <input
                    type="text"
                    name="comprobante_pago"
                    placeholder="Nro. factura, operación, etc."
                    value={form.comprobante_pago}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      fontSize: 14,
                      color: '#1e293b',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      background: 'white',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            </div>

            {/* Info bancaria cuando es transferencia */}
            {form.metodo_pago === "TRANSFERENCIA" && (
              <div style={{ marginTop: 24 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16
                }}>
                  <Building2 size={18} color="#667eea" />
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                    Datos para transferencia
                  </h4>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  {CUENTAS_BANCARIAS.map((cuenta) => (
                    <div
                      key={cuenta.id}
                      style={{
                        padding: 16,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: cuenta.color
                          }} />
                          {cuenta.banco}
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12
                      }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
                            ALIAS
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <span style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#1e293b',
                              fontFamily: 'monospace'
                            }}>
                              {cuenta.alias}
                            </span>
                            <button
                              type="button"
                              onClick={() => copiarTexto(cuenta.alias)}
                              style={{
                                padding: '4px 8px',
                                fontSize: 11,
                                background: cuenta.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Copiar
                            </button>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
                            CBU
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <span style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#1e293b',
                              fontFamily: 'monospace'
                            }}>
                              {cuenta.cbu}
                            </span>
                            <button
                              type="button"
                              onClick={() => copiarTexto(cuenta.cbu)}
                              style={{
                                padding: '4px 8px',
                                fontSize: 11,
                                background: cuenta.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Copiar
                            </button>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
                            TITULAR
                          </div>
                          <span style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#1e293b'
                          }}>
                            {cuenta.titular}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón de WhatsApp */}
                <div style={{
                  marginTop: 16,
                  padding: 16,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                      ¿Ya realizaste la transferencia?
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
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
                      padding: '12px 20px',
                      background: '#25d366',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1fb855'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#25d366'}
                  >
                    <MessageCircle size={18} />
                    Enviar comprobante
                  </button>
                </div>
              </div>
            )}

            {/* Notas */}
            <div style={{ marginTop: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                marginBottom: 8
              }}>
                Notas adicionales (opcional)
              </label>
              <textarea
                name="notas"
                rows={3}
                placeholder="Cualquier información adicional relevante..."
                value={form.notas}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: 'white',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 24,
              padding: 16,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ color: '#991b1b', fontWeight: 600, fontSize: 14 }}>
                {error}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 12,
            paddingTop: 8
          }}>
            <button
              type="button"
              onClick={() => navigate("/pagos")}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                color: '#64748b',
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: saving ? 0.6 : 1
              }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.borderColor = '#cbd5e1')}
onMouseLeave={(e) => !saving && (e.currentTarget.style.borderColor = '#e2e8f0')}
>
Cancelar
</button>
                <button 
          type="submit" 
          disabled={saving || !cajaAbierta}
          style={{
            padding: '12px 24px',
            background: saving || !cajaAbierta 
              ? '#cbd5e1' 
              : sentidoActual === 'INGRESO' 
                ? '#10b981'
                : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: saving || !cajaAbierta ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
            boxShadow: saving || !cajaAbierta ? 'none' : '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="spin" />
              Guardando...
            </>
          ) : (
            <>
              {sentidoActual === 'INGRESO' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              Registrar {sentidoActual.toLowerCase()}
            </>
          )}
        </button>
      </div>

    </form>

  </div>
</Layout>
        );
    }
export default PagoExtraordinarioForm;