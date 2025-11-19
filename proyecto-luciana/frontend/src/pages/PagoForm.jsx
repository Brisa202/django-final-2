import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import Layout from "../components/Layout";
import { 
  ArrowLeft, 
  Calendar,
  DollarSign,
  Shield,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  MessageCircle,
  Info,
  AlertTriangle
} from 'lucide-react';

const tiposAlquiler = [
  { value: "SALDO", label: "Saldo", icon: DollarSign, color: "#10b981" },
  { value: "GARANTIA", label: "Garantía cobrada", icon: Shield, color: "#3b82f6" },
  { value: "DEVOLUCION_GARANTIA", label: "Devolución garantía", icon: Shield, color: "#8b5cf6" },
  { value: "APLICACION_GARANTIA", label: "Garantía aplicada", icon: Shield, color: "#ef4444" },
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

function PagoForm() {
  const navigate = useNavigate();

  const [alquileresOptions, setAlquileresOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [alquilerSeleccionado, setAlquilerSeleccionado] = useState(null);
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [loadingCaja, setLoadingCaja] = useState(false);

  // Estado de pagos del alquiler
  const [estadoPagos, setEstadoPagos] = useState({
    totalPagado: 0,
    saldoPendiente: 0,
    garantiaCobrada: false,
    garantiaDevuelta: false,
    garantiaAplicada: false
  });

  const [form, setForm] = useState({
    alquiler: "",
    monto: "",
    tipo_pago: "SALDO",
    metodo_pago: "EFECTIVO",
    comprobante_pago: "",
    notas: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [advertencia, setAdvertencia] = useState("");

  useEffect(() => {
    loadOptions();
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

  async function loadOptions() {
    setLoadingOptions(true);
    try {
      const res = await axios.get("/api/alquileres/", { 
        params: { ordering: "-id" } 
      });

      const alquileresData = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];

      setAlquileresOptions(alquileresData.slice(0, 100));
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los alquileres.");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function cargarEstadoPagos(alquilerId) {
    try {
      const res = await axios.get(`/api/pagos/`, {
        params: { alquiler: alquilerId }
      });

      const pagos = Array.isArray(res.data) ? res.data : res.data.results || [];

      // Calcular total pagado de SALDO
      const totalPagadoSaldo = pagos
        .filter(p => p.tipo_pago === "SALDO")
        .reduce((sum, p) => sum + Number(p.monto), 0);

      // Verificar estados de garantía
      const garantiaCobrada = pagos.some(p => p.tipo_pago === "GARANTIA");
      const garantiaDevuelta = pagos.some(p => p.tipo_pago === "DEVOLUCION_GARANTIA");
      const garantiaAplicada = pagos.some(p => p.tipo_pago === "APLICACION_GARANTIA");

      return {
        totalPagado: totalPagadoSaldo,
        garantiaCobrada,
        garantiaDevuelta,
        garantiaAplicada
      };
    } catch (err) {
      console.error("Error al cargar estado de pagos", err);
      return {
        totalPagado: 0,
        garantiaCobrada: false,
        garantiaDevuelta: false,
        garantiaAplicada: false
      };
    }
  }

  async function handleAlquilerChange(e) {
    const alquilerId = e.target.value;
    setForm((prev) => ({ ...prev, alquiler: alquilerId, monto: "" }));
    setAlquilerSeleccionado(null);
    setEstadoPagos({
      totalPagado: 0,
      saldoPendiente: 0,
      garantiaCobrada: false,
      garantiaDevuelta: false,
      garantiaAplicada: false
    });
    setError("");
    setAdvertencia("");

    if (!alquilerId) return;

    try {
      const res = await axios.get(`/api/alquileres/${alquilerId}`);
      const alq = res.data;
      setAlquilerSeleccionado(alq);

      // Cargar estado de pagos
      const estado = await cargarEstadoPagos(alquilerId);
      const saldoPendiente = Number(alq.monto_total || 0) - estado.totalPagado;
      
      setEstadoPagos({
        ...estado,
        saldoPendiente: Math.max(0, saldoPendiente)
      });

      // Establecer monto según tipo
      if (form.tipo_pago === "SALDO") {
        setForm((prev) => ({ 
          ...prev, 
          monto: Math.max(0, saldoPendiente).toString()
        }));
      } else if (form.tipo_pago === "GARANTIA" && !estado.garantiaCobrada && !estado.garantiaDevuelta && !estado.garantiaAplicada) {
        setForm((prev) => ({ 
          ...prev, 
          monto: alq.garantia_monto || "" 
        }));
      } else if (form.tipo_pago === "DEVOLUCION_GARANTIA" && estado.garantiaCobrada && !estado.garantiaDevuelta && !estado.garantiaAplicada) {
        setForm((prev) => ({ 
          ...prev, 
          monto: alq.garantia_monto || "" 
        }));
      } else if (form.tipo_pago === "APLICACION_GARANTIA" && estado.garantiaCobrada && !estado.garantiaAplicada && !estado.garantiaDevuelta) {
        setForm((prev) => ({ 
          ...prev, 
          monto: "" 
        }));
      }
    } catch (error) {
      console.error("Error al obtener alquiler", error);
      setError("No se pudo cargar el alquiler");
    }
  }

  function handleTipoPagoChange(e) {
    const tipo = e.target.value;
    setForm((prev) => ({ ...prev, tipo_pago: tipo }));
    setError("");
    setAdvertencia("");

    if (!alquilerSeleccionado) return;

    if (tipo === "SALDO") {
      const saldoPendiente = Number(alquilerSeleccionado.monto_total || 0) - estadoPagos.totalPagado;
      setForm((prev) => ({ ...prev, monto: Math.max(0, saldoPendiente).toString() }));
    } else if (tipo === "GARANTIA") {
      if (estadoPagos.garantiaCobrada) {
        setAdvertencia("⚠️ La garantía ya fue cobrada anteriormente");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else if (estadoPagos.garantiaDevuelta) {
        setAdvertencia("⚠️ La garantía ya fue devuelta, no se puede cobrar");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else if (estadoPagos.garantiaAplicada) {
        setAdvertencia("⚠️ La garantía ya fue aplicada, no se puede cobrar");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else {
        setForm((prev) => ({ ...prev, monto: alquilerSeleccionado.garantia_monto || "" }));
      }
    } else if (tipo === "DEVOLUCION_GARANTIA") {
      if (!estadoPagos.garantiaCobrada) {
        setAdvertencia("⚠️ No se ha cobrado la garantía todavía");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else if (estadoPagos.garantiaAplicada) {
        setAdvertencia("⚠️ La garantía ya fue aplicada a daños, no se puede devolver");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else if (estadoPagos.garantiaDevuelta) {
        setAdvertencia("⚠️ La garantía ya fue devuelta anteriormente");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else {
        setForm((prev) => ({ ...prev, monto: alquilerSeleccionado.garantia_monto || "" }));
      }
    } else if (tipo === "APLICACION_GARANTIA") {
      if (!estadoPagos.garantiaCobrada) {
        setAdvertencia("⚠️ No se ha cobrado la garantía todavía");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else if (estadoPagos.garantiaDevuelta) {
        setAdvertencia("⚠️ La garantía ya fue devuelta, no se puede aplicar");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else if (estadoPagos.garantiaAplicada) {
        setAdvertencia("⚠️ La garantía ya fue aplicada anteriormente");
        setForm((prev) => ({ ...prev, monto: "" }));
      } else {
        setForm((prev) => ({ ...prev, monto: "" }));
      }
    } else {
      setForm((prev) => ({ ...prev, monto: "" }));
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setAdvertencia("");

    if (!form.alquiler) {
      setError("Seleccioná un alquiler.");
      return;
    }

    if (!form.monto || Number(form.monto) <= 0) {
      setError("El monto debe ser mayor a cero.");
      return;
    }

    // Validaciones específicas por tipo
    if (form.tipo_pago === "SALDO") {
      if (Number(form.monto) > estadoPagos.saldoPendiente) {
        setError(`El monto no puede ser mayor al saldo pendiente ($${estadoPagos.saldoPendiente.toLocaleString("es-AR")})`);
        return;
      }
    }

    if (form.tipo_pago === "GARANTIA") {
      if (estadoPagos.garantiaCobrada) {
        setError("La garantía ya fue cobrada. No se puede cobrar nuevamente.");
        return;
      }
      if (estadoPagos.garantiaDevuelta) {
        setError("La garantía ya fue devuelta. No se puede cobrar.");
        return;
      }
      if (estadoPagos.garantiaAplicada) {
        setError("La garantía ya fue aplicada. No se puede cobrar.");
        return;
      }
    }

    if (form.tipo_pago === "DEVOLUCION_GARANTIA") {
      if (!estadoPagos.garantiaCobrada) {
        setError("No se puede devolver la garantía porque no fue cobrada.");
        return;
      }
      if (estadoPagos.garantiaAplicada) {
        setError("No se puede devolver la garantía porque ya fue aplicada a daños.");
        return;
      }
      if (estadoPagos.garantiaDevuelta) {
        setError("La garantía ya fue devuelta anteriormente.");
        return;
      }
    }

    if (form.tipo_pago === "APLICACION_GARANTIA") {
      if (!estadoPagos.garantiaCobrada) {
        setError("No se puede aplicar la garantía porque no fue cobrada.");
        return;
      }
      if (estadoPagos.garantiaDevuelta) {
        setError("No se puede aplicar la garantía porque ya fue devuelta.");
        return;
      }
      if (estadoPagos.garantiaAplicada) {
        setError("La garantía ya fue aplicada anteriormente.");
        return;
      }
    }

    const payload = {
      alquiler: Number(form.alquiler),
      monto: Number(form.monto),
      tipo_pago: form.tipo_pago,
      metodo_pago: form.metodo_pago,
      comprobante_pago: form.comprobante_pago || "",
      notas: form.notas || "",
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

  function labelAlquiler(a) {
    const cliente = a.cliente_nombre || a.cliente_fk?.nombre || a.cliente?.nombre || "Sin cliente";
    return `#${a.id} · ${cliente}`;
  }

  function copiarTexto(texto) {
    navigator.clipboard.writeText(texto);
  }

  function enviarWhatsApp() {
    const mensaje = `Hola! Necesito enviar un comprobante de pago. \n\nAlquiler: ${alquilerSeleccionado ? `#${alquilerSeleccionado.id}` : ''}\nMonto: $${form.monto}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  // Determinar si el tipo de pago está disponible
  const tipoPagoDisponible = (tipo) => {
    if (!alquilerSeleccionado) return true;
    
    // SALDO siempre disponible
    if (tipo === "SALDO") return true;
    
    // Si se cobró la garantía, se bloquean DEVOLUCION y APLICACION
    if (estadoPagos.garantiaCobrada) {
      if (tipo === "DEVOLUCION_GARANTIA" || tipo === "APLICACION_GARANTIA") {
        return false;
      }
    }
    
    // Si se devolvió la garantía, se bloquean GARANTIA y APLICACION
    if (estadoPagos.garantiaDevuelta) {
      if (tipo === "GARANTIA" || tipo === "APLICACION_GARANTIA") {
        return false;
      }
    }
    
    // Si se aplicó la garantía, se bloquean GARANTIA y DEVOLUCION
    if (estadoPagos.garantiaAplicada) {
      if (tipo === "GARANTIA" || tipo === "DEVOLUCION_GARANTIA") {
        return false;
      }
    }
    
    return true;
  };

  const tipoSeleccionado = tiposAlquiler.find(t => t.value === form.tipo_pago);
  const IconoTipo = tipoSeleccionado?.icon || DollarSign;

  // Función para obtener el texto del estado de la garantía
  const obtenerEstadoGarantia = () => {
    if (estadoPagos.garantiaDevuelta) {
      return { texto: "Garantía devuelta al cliente", icono: CheckCircle2, color: "#8b5cf6" };
    }
    if (estadoPagos.garantiaAplicada) {
      return { texto: "Garantía aplicada a daños", icono: AlertTriangle, color: "#ef4444" };
    }
    if (estadoPagos.garantiaCobrada) {
      return { texto: "Garantía cobrada - Pendiente devolución o aplicación", icono: Info, color: "#f59e0b" };
    }
    return { texto: "Garantía no cobrada", icono: AlertCircle, color: "#94a3b8" };
  };

  const estadoGarantia = obtenerEstadoGarantia();
  const EstadoIcono = estadoGarantia.icono;

  return (
    <Layout title="Registrar Pago de Alquiler">
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
              color: '#64748b',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: 16,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1e293b'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            <ArrowLeft size={18} />
            Volver a pagos
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 8, color: '#1e293b' }}>
                Registrar Pago de Alquiler
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                Registrá saldos o garantías asociadas a un alquiler
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
                fontSize: 13
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
                background: 'linear-gradient(135deg, #10b98115 0%, #05966915 100%)',
                border: '2px solid #10b98130',
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
                background: 'linear-gradient(135deg, #ef444415 0%, #dc262615 100%)',
                border: '2px solid #ef444430',
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
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '2px solid #fecaca',
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
          
          {/* Selección de Alquiler */}
          <div style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                  Seleccionar Alquiler
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Elegí el alquiler al que corresponde el pago
                </p>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
                zIndex: 1
              }} />
              <select
                name="alquiler"
                value={form.alquiler}
                onChange={handleAlquilerChange}
                disabled={loadingOptions}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1e293b',
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              >
                <option value="" style={{ color: '#94a3b8' }}>
                  {loadingOptions ? "Cargando alquileres..." : "-- Seleccioná un alquiler --"}
                </option>
                {alquileresOptions.map((a) => (
                  <option key={a.id} value={a.id} style={{ color: '#1e293b' }}>
                    ALQ-{labelAlquiler(a)}
                  </option>
                ))}
              </select>
            </div>

            {/* Info del alquiler seleccionado */}
            {alquilerSeleccionado && (
              <div style={{
                marginTop: 20,
                padding: 20,
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: 12,
                border: '2px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 20,
                  marginBottom: 16
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8
                    }}>
                      <User size={14} color="#64748b" />
                      <span style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '0.5px'
                      }}>
                        Cliente
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                      {alquilerSeleccionado.cliente_nombre || "Sin cliente"}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8
                    }}>
                      <DollarSign size={14} color="#10b981" />
                      <span style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '0.5px'
                      }}>
                        Total Alquiler
                      </span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                      ${Number(alquilerSeleccionado.monto_total || 0).toLocaleString("es-AR")}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8
                    }}>
                      <Shield size={14} color="#3b82f6" />
                      <span style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '0.5px'
                      }}>
                        Garantía
                      </span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                      ${Number(alquilerSeleccionado.garantia_monto || 0).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>

                {/* Estado de pagos */}
                <div style={{
                  padding: 16,
                  background: 'white',
                  borderRadius: 8,
                  border: '2px solid #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12
                  }}>
                    <Info size={16} color="#667eea" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                      Estado de pagos
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        Pagado del saldo
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                        ${estadoPagos.totalPagado.toLocaleString("es-AR")}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        Saldo pendiente
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: estadoPagos.saldoPendiente > 0 ? '#ef4444' : '#10b981' }}>
                        ${estadoPagos.saldoPendiente.toLocaleString("es-AR")}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        Estado de garantía
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 600
                      }}>
                        <EstadoIcono size={14} color={estadoGarantia.color} />
                        <span style={{ color: estadoGarantia.color }}>{estadoGarantia.texto}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detalles del Pago */}
          <div style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${tipoSeleccionado?.color || '#10b981'} 0%, ${tipoSeleccionado?.color || '#10b981'}dd 100%)`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconoTipo size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                  Detalles del Pago
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Especificá el tipo, monto y forma de pago
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20
            }}>
              {/* Tipo de pago */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 8
                }}>
                  Tipo de pago
                </label>
                <select
                  name="tipo_pago"
                  value={form.tipo_pago}
                  onChange={handleTipoPagoChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1e293b',
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {tiposAlquiler.map((t) => (
                    <option 
                      key={t.value} 
                      value={t.value} 
                      style={{ 
                        color: tipoPagoDisponible(t.value) ? '#1e293b' : '#94a3b8' 
                      }}
                      disabled={!tipoPagoDisponible(t.value)}
                    >
                      {t.label} {!tipoPagoDisponible(t.value) ? '(No disponible)' : ''}
                    </option>
                  ))}
                </select>
              </div>

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
                  {form.tipo_pago === "SALDO" && estadoPagos.saldoPendiente > 0 && (
                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500, marginLeft: 8 }}>
                      (Máx: ${estadoPagos.saldoPendiente.toLocaleString("es-AR")})
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#94a3b8',
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
                      border: '2px solid #e2e8f0',
                      borderRadius: 8,
                      background: 'white'
                    }}
                  />
                </div>
              </div>

              {/* Método */}
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
                    color: '#94a3b8',
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
                      border: '2px solid #e2e8f0',
                      borderRadius: 8,
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="EFECTIVO" style={{ color: '#1e293b' }}>Efectivo</option>
                    <option value="TRANSFERENCIA" style={{ color: '#1e293b' }}>Transferencia</option>
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
                  Referencia (opcional)
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={18} style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    zIndex: 1
                  }} />
                  <input
                    type="text"
                    name="comprobante_pago"
                    placeholder="Nro operación / alias / etc."
                    value={form.comprobante_pago}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      fontSize: 14,
                      color: '#1e293b',
                      border: '2px solid #e2e8f0',
                      borderRadius: 8,
                      background: 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Advertencia de estado */}
            {advertencia && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #fcd34d',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#92400e',
                fontSize: 14,
                fontWeight: 600
              }}>
                <AlertTriangle size={18} />
                {advertencia}
              </div>
            )}

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
                        background: `linear-gradient(135deg, ${cuenta.color}10 0%, ${cuenta.color}05 100%)`,
                        border: `2px solid ${cuenta.color}30`,
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
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
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
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
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
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
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
                  background: 'linear-gradient(135deg, #25d36615 0%, #25d36608 100%)',
                  border: '2px solid #25d36630',
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
            <div style={{
              marginTop: 16,
              padding: 16,
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: 12
            }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                marginBottom: 8
              }}>
                Notas (opcional)
              </label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Agregá una nota o referencia adicional"
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#1e293b',
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  background: 'white',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                border: '2px solid #fecaca',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#991b1b',
                fontWeight: 600
              }}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Acciones */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/pagos")}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  color: '#374151',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving || !cajaAbierta}
                style={{
                  padding: '10px 16px',
                  background: saving || !cajaAbierta ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: saving || !cajaAbierta ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {saving ? <Loader2 size={16} className="spin" /> : 'Registrar Pago'}
              </button>
            </div>

          </div>

        </form>
      </div>
    </Layout>
  );
}

export default PagoForm;