// CajaDashboard.jsx - CÓDIGO COMPLETO CON TODOS LOS GRÁFICOS
import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
  BarChart3,
  PieChart,
} from 'lucide-react';
import Layout from '../components/Layout';
import axios from '../api/axios';

const getBadgeClass = (tipo) => {
  return tipo === 'INGRESO'
    ? 'ent-badge ent-badge-entregado'
    : 'ent-badge ent-badge-no_entregado';
};

const getMetodoBadgeClass = (metodo) => {
  return metodo === 'EFECTIVO'
    ? 'ent-badge ent-badge-en_camino'
    : 'ent-badge ent-badge-pendiente';
};

export default function CajaDashboard() {
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState({
    ingresos: 0,
    egresos: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [empleados, setEmpleados] = useState([]);

  const [formAbrir, setFormAbrir] = useState({
    empleado: '',
    balance_inicial: 0,
    notas: '',
  });

  const [formCerrar, setFormCerrar] = useState({
    balance_final: 0,
    notas: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // 1) Caja abierta
      try {
        const resCaja = await axios.get('/api/cajas/caja_abierta/');
        if (resCaja.data) {
          setCajaAbierta(resCaja.data);
        } else {
          setCajaAbierta(null);
        }
      } catch (error) {
        // 404 = no hay caja abierta, es normal
        if (error.response?.status === 404) {
          setCajaAbierta(null);
        } else {
          console.error('Error cargando caja_abierta:', error);
        }
      }

      // 2) Movimientos del día
      try {
        const resMovs = await axios.get('/api/cajas/movimientos_hoy/');
        if (resMovs.data) {
          setMovimientos(resMovs.data.movimientos || []);
          setResumen(
            resMovs.data.resumen || {
              ingresos: 0,
              egresos: 0,
              balance: 0,
            }
          );
        }
      } catch (error) {
        console.error('Error cargando movimientos_hoy:', error);
      }

      // 3) Empleados disponibles - TRAER TODOS LOS ACTIVOS
      try {
        const resEmpleados = await axios.get('/api/gestion-empleados/');
        
        if (Array.isArray(resEmpleados.data)) {
          // Filtrar solo empleados activos
          const empleadosActivos = resEmpleados.data.filter(emp => emp.activo === true);
          
          console.log('📋 Empleados cargados:', empleadosActivos.length);
          console.log('👥 Roles disponibles:', empleadosActivos.map(e => ({
            nombre: `${e.nombre} ${e.apellido}`,
            rol: e.rol
          })));
          
          setEmpleados(empleadosActivos);
        } else {
          setEmpleados([]);
        }
      } catch (error) {
        console.error('❌ Error cargando empleados:', error);
        setEmpleados([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirCaja = async (e) => {
    e.preventDefault();

    if (!formAbrir.empleado) {
      alert('Debes seleccionar un empleado responsable.');
      return;
    }

    try {
      const payload = {
        empleado: parseInt(formAbrir.empleado, 10),
        balance_inicial: parseFloat(formAbrir.balance_inicial) || 0,
        notas: formAbrir.notas || '',
      };

      await axios.post('/api/cajas/', payload);
      setShowAbrirModal(false);
      setFormAbrir({ empleado: '', balance_inicial: 0, notas: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error completo al abrir caja:', error.response?.data);
      alert(error.response?.data?.error || 'Error al abrir caja');
    }
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `/api/cajas/${cajaAbierta.id_caja}/cerrar_caja/`,
        formCerrar
      );
      setShowCerrarModal(false);
      setFormCerrar({ balance_final: 0, notas: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      alert(error.response?.data?.error || 'Error al cerrar caja');
    }
  };

  const calcularDiferencia = () => {
    const diff =
      formCerrar.balance_final -
      (cajaAbierta?.balance_efectivo_teorico || 0);
    if (diff > 0) {
      return {
        texto: `+$${Math.abs(diff).toLocaleString('es-AR', {
          minimumFractionDigits: 2,
        })} (Sobrante)`,
        color: '#16a34a',
      };
    } else if (diff < 0) {
      return {
        texto: `-$${Math.abs(diff).toLocaleString('es-AR', {
          minimumFractionDigits: 2,
        })} (Faltante)`,
        color: '#dc2626',
      };
    }
    return {
      texto: '✓ Sin diferencias - Cuadrado perfecto',
      color: '#16a34a',
    };
  };

  // =========================
  //  Gráfico Arqueo (Barras)
  // =========================
  const ArqueoChart = () => {
    const inicial_ef = cajaAbierta?.monto_inicial_efectivo || 0;
    const inicial_tr = cajaAbierta?.monto_inicial_transferencia || 0;
    const actual_ef = cajaAbierta?.balance_efectivo_teorico || 0;
    const actual_tr = cajaAbierta?.balance_transferencia_teorico || 0;

    const max = Math.max(inicial_ef, inicial_tr, actual_ef, actual_tr, 100);

    return (
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <BarChart3 size={20} color="#3b82f6" />
          Arqueo de Caja
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* EFECTIVO */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#64748b',
                }}
              >
                Efectivo
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#16a34a',
                }}
              >
                $
                {actual_ef.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '40px',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${(inicial_ef / max) * 100}%`,
                    height: '100%',
                    background: '#94a3b8',
                    transition: 'width 0.5s ease',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: '#1e293b',
                    fontWeight: '600',
                  }}
                >
                  Inicial: $
                  {inicial_ef.toLocaleString('es-AR', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '40px',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${(actual_ef / max) * 100}%`,
                    height: '100%',
                    background:
                      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    transition: 'width 0.5s ease',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: actual_ef > 0 ? 'white' : '#1e293b',
                    fontWeight: '600',
                    textShadow: actual_ef > 0 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  Actual: $
                  {actual_ef.toLocaleString('es-AR', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* TRANSFERENCIAS */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#64748b',
                }}
              >
                Transferencias
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2563eb',
                }}
              >
                $
                {actual_tr.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '40px',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${(inicial_tr / max) * 100}%`,
                    height: '100%',
                    background: '#94a3b8',
                    transition: 'width 0.5s ease',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: '#1e293b',
                    fontWeight: '600',
                  }}
                >
                  Inicial: $
                  {inicial_tr.toLocaleString('es-AR', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '40px',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${(actual_tr / max) * 100}%`,
                    height: '100%',
                    background:
                      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    transition: 'width 0.5s ease',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: actual_tr > 0 ? 'white' : '#1e293b',
                    fontWeight: '600',
                    textShadow: actual_tr > 0 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  Actual: $
                  {actual_tr.toLocaleString('es-AR', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================
  //   Gráfico de Torta
  // =========================
  const PieChartComponent = () => {
    const efectivo = cajaAbierta?.balance_efectivo_teorico || 0;
    const transferencia = cajaAbierta?.balance_transferencia_teorico || 0;
    const total = efectivo + transferencia;

    const porcentajeEfectivo = total > 0 ? (efectivo / total) * 100 : 50;
    const porcentajeTransferencia =
      total > 0 ? (transferencia / total) * 100 : 50;

    return (
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <PieChart size={20} color="#3b82f6" />
          Distribución Efectivo vs Transferencias
        </h3>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div style={{ position: 'relative', width: '200px', height: '200px' }}>
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#10b981"
                strokeWidth="40"
                strokeDasharray={`${porcentajeEfectivo * 5.03} 503`}
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="40"
                strokeDasharray={`${porcentajeTransferencia * 5.03} 503`}
                strokeDashoffset={`-${porcentajeEfectivo * 5.03}`}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                }}
              >
                $
                {total.toLocaleString('es-AR', {
                  minimumFractionDigits: 0,
                })}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f0fdf4',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10b981',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#166534',
                  }}
                >
                  Efectivo
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#16a34a',
                  }}
                >
                  $
                  {efectivo.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#166534',
                  }}
                >
                  {porcentajeEfectivo.toFixed(1)}%
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#eff6ff',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e3a8a',
                  }}
                >
                  Transferencias
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#2563eb',
                  }}
                >
                  $
                  {transferencia.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#1e3a8a',
                  }}
                >
                  {porcentajeTransferencia.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================
  //       RENDER
  // =========================
  return (
    <Layout title="Sistema de Caja">
      <div className="ent-card">
        <div className="ent-header">
          <div className="ent-header-title">
            <h2>Caja</h2>
            <p>Gestión de ingresos, egresos, garantías y señas</p>
          </div>

          <div className="ent-toolbar">
            <button
              className="ent-refresh"
              onClick={cargarDatos}
              disabled={loading}
            >
              <RefreshCw size={16} />
            </button>

            {cajaAbierta ? (
              <button
                className="ent-new-btn"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                }}
                onClick={() => setShowCerrarModal(true)}
              >
                <Lock size={18} />
                Cerrar Caja
              </button>
            ) : (
              <button
                className="ent-new-btn"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
                onClick={() => setShowAbrirModal(true)}
              >
                <Unlock size={18} />
                Abrir Caja
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Cargando datos de caja...</p>
          </div>
        ) : !cajaAbierta ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                background: '#f1f5f9',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Lock size={40} color="#94a3b8" />
            </div>
            <h3
              style={{
                fontSize: '20px',
                marginBottom: '10px',
                color: '#1e293b',
              }}
            >
              No hay caja abierta
            </h3>
            <p
              style={{
                color: '#64748b',
                marginBottom: '24px',
              }}
            >
              Debes abrir una caja para comenzar a registrar movimientos
            </p>
            <button
              className="ent-new-btn"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              }}
              onClick={() => setShowAbrirModal(true)}
            >
              Abrir Caja Ahora
            </button>
          </div>
        ) : (
          <>
            {/* Cards de resumen */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  background:
                    'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '8px',
                      borderRadius: '8px',
                    }}
                  >
                    <DollarSign size={24} />
                  </div>
                  <span style={{ opacity: 0.9, fontSize: '14px' }}>
                    Balance Actual
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  $
                  {(cajaAbierta.balance_total_teorico || 0).toLocaleString(
                    'es-AR',
                    { minimumFractionDigits: 2 }
                  )}
                </p>
              </div>

              <div
                style={{
                  background:
                    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '8px',
                      borderRadius: '8px',
                    }}
                  >
                    <TrendingUp size={24} />
                  </div>
                  <span style={{ opacity: 0.9, fontSize: '14px' }}>
                    Ingresos
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  $
                  {(cajaAbierta.total_ingresos || 0).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div
                style={{
                  background:
                    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '8px',
                      borderRadius: '8px',
                    }}
                  >
                    <TrendingDown size={24} />
                  </div>
                  <span style={{ opacity: 0.9, fontSize: '14px' }}>
                    Egresos
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  $
                  {(cajaAbierta.total_egresos || 0).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div
                style={{
                  background:
                    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(236, 72, 153, 0.2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '8px',
                      borderRadius: '8px',
                    }}
                  >
                    <DollarSign size={24} />
                  </div>
                  <span style={{ opacity: 0.9, fontSize: '14px' }}>
                    Saldo
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  $
                  {(
                    (cajaAbierta.total_ingresos || 0) -
                    (cajaAbierta.total_egresos || 0)
                  ).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Gráficos */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
              }}
            >
              <ArqueoChart />
              <PieChartComponent />
            </div>

            {/* Tabla de movimientos */}
            <div style={{ marginTop: '24px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileText size={20} color="#3b82f6" />
                Movimientos de Hoy
              </h3>

              <table className="ent-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Método</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: 'center',
                          padding: '40px',
                        }}
                      >
                        No hay movimientos registrados
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((mov) => (
                      <tr key={mov.id}>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Clock size={14} color="#94a3b8" />
                            <span style={{ fontSize: '13px' }}>
                              {new Date(
                                mov.fecha
                              ).toLocaleString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={getBadgeClass(mov.tipo)}>
                            {mov.tipo}
                          </span>
                        </td>
                        <td>{mov.categoria}</td>
                        <td>
                          <span
                            className={getMetodoBadgeClass(
                              mov.metodo_pago
                            )}
                          >
                            {mov.metodo_pago}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: '13px',
                            color: '#64748b',
                          }}
                        >
                          {mov.descripcion}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color:
                              mov.tipo === 'INGRESO'
                                ? '#16a34a'
                                : '#dc2626',
                          }}
                        >
                          {mov.tipo === 'INGRESO' ? '+' : '-'}$
                          {mov.monto.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Abrir Caja */}
      {showAbrirModal && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setShowAbrirModal(false)}
            style={{ zIndex: 999 }}
          />
          <div
            className="modal"
            style={{
              maxWidth: '500px',
              zIndex: 1000,
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h3
              style={{
                marginTop: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Unlock size={24} color="#10b981" />
              Abrir Caja
            </h3>

            <form onSubmit={abrirCaja}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                  }}
                >
                  Empleado Responsable *
                </label>
                <select
                  value={formAbrir.empleado}
                  onChange={(e) =>
                    setFormAbrir({
                      ...formAbrir,
                      empleado: e.target.value,
                    })
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Seleccionar empleado</option>
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre_completo
                        ? emp.nombre_completo
                        : `${emp.nombre} ${emp.apellido}`}
                      {emp.rol && ` - ${emp.rol}`}
                    </option>
                  ))}
                </select>

                {/* Mensaje cuando no hay empleados activos */}
                {!loading && empleados.length === 0 && (
                  <p
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#f97316',
                    }}
                  >
                    No hay empleados activos para seleccionar. Verificá la
                    pantalla <strong>"Empleados"</strong> y los roles/estados.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                  }}
                >
                  Balance Inicial (Efectivo)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formAbrir.balance_inicial}
                  onChange={(e) =>
                    setFormAbrir({
                      ...formAbrir,
                      balance_inicial: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                  }}
                >
                  Notas (Opcional)
                </label>
                <textarea
                  value={formAbrir.notas}
                  onChange={(e) =>
                    setFormAbrir({
                      ...formAbrir,
                      notas: e.target.value,
                    })
                  }
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAbrirModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={empleados.length === 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    cursor: empleados.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: empleados.length === 0 ? 0.5 : 1,
                  }}
                >
                  <Unlock size={18} />
                  Abrir Caja
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal Cerrar Caja */}
      {showCerrarModal && cajaAbierta && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setShowCerrarModal(false)}
            style={{ zIndex: 999 }}
          />
          <div
            className="modal"
            style={{
              maxWidth: '600px',
              zIndex: 1000,
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h3
              style={{
                marginTop: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Lock size={24} color="#ef4444" />
              Cerrar Caja
            </h3>

            <div
              style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  fontSize: '14px',
                  color: '#64748b',
                  marginBottom: '12px',
                }}
              >
                Resumen del Día
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '14px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Balance Inicial:</span>
                  <div
                    style={{
                      fontWeight: 'bold',
                      marginTop: '4px',
                    }}
                  >
                    $
                    {(cajaAbierta.balance_inicial || 0).toLocaleString(
                      'es-AR',
                      { minimumFractionDigits: 2 }
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Total Ingresos:</span>
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: '#16a34a',
                      marginTop: '4px',
                    }}
                  >
                    +$
                    {(cajaAbierta.total_ingresos || 0).toLocaleString(
                      'es-AR',
                      { minimumFractionDigits: 2 }
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Total Egresos:</span>
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: '#dc2626',
                      marginTop: '4px',
                    }}
                  >
                    -$
                    {(cajaAbierta.total_egresos || 0).toLocaleString(
                      'es-AR',
                      { minimumFractionDigits: 2 }
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>
                    Balance Teórico (Efectivo):
                  </span>
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: '#2563eb',
                      marginTop: '4px',
                    }}
                  >
                    $
                    {(cajaAbierta.balance_efectivo_teorico || 0).toLocaleString(
                      'es-AR',
                      { minimumFractionDigits: 2 }
                    )}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={cerrarCaja}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                  }}
                >
                  Balance Final Real (Efectivo Contado) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formCerrar.balance_final}
                  onChange={(e) =>
                    setFormCerrar({
                      ...formCerrar,
                      balance_final:
                        parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  placeholder="Ingresá el efectivo real contado"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  }}
                />

                {formCerrar.balance_final > 0 && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      background:
                        calcularDiferencia().color === '#16a34a'
                          ? '#f0fdf4'
                          : '#fef2f2',
                      border: `1px solid ${calcularDiferencia().color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle
                      size={18}
                      color={calcularDiferencia().color}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: calcularDiferencia().color,
                      }}
                    >
                      {calcularDiferencia().texto}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                  }}
                >
                  Observaciones de Cierre
                </label>
                <textarea
                  value={formCerrar.notas}
                  onChange={(e) =>
                    setFormCerrar({
                      ...formCerrar,
                      notas: e.target.value,
                    })
                  }
                  placeholder="Ej: Diferencias encontradas, incidentes, etc."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  background: '#fff7ed',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #fb923c',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <AlertCircle
                  size={18}
                  color="#f97316"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#9a3412',
                  }}
                >
                  <strong>Importante:</strong> Al cerrar la caja, no podrás
                  registrar más movimientos hasta que se abra una nueva
                  caja.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCerrarModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Lock size={18} />
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </Layout>
  );
}

