import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Wrench, 
  Zap,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

function SeleccionTipoPago() {
  const navigate = useNavigate();

  const tiposPago = [
    {
      id: "alquiler",
      titulo: "Pago de Alquiler",
      descripcion: "Registrar señas, saldos o garantías de alquileres",
      icono: Calendar,
      color: "#667eea",
      ruta: "/pagos/alquiler",
      ejemplos: ["Seña de alquiler", "Saldo pendiente", "Garantía cobrada", "Devolución de garantía"]
    },
    {
      id: "insumos",
      titulo: "Compra de Insumos",
      descripcion: "Registro de compras de materiales y equipamiento",
      icono: ShoppingCart,
      color: "#f59e0b",
      ruta: "/pagos/extraordinario",
      tipo_pago: "COMPRA_INSUMOS",
      ejemplos: ["Cables y conectores", "Luces LED", "Parlantes", "Accesorios"]
    },
    {
      id: "trabajadores",
      titulo: "Pago a Trabajadores",
      descripcion: "Sueldos, honorarios y pagos al personal",
      icono: Users,
      color: "#10b981",
      ruta: "/pagos/extraordinario",
      tipo_pago: "PAGO_TRABAJADORES",
      ejemplos: ["Sueldo mensual", "Pago por evento", "Horas extras", "Honorarios"]
    },
    {
      id: "servicios",
      titulo: "Servicios",
      descripcion: "Pagos de servicios recurrentes o extraordinarios",
      icono: Zap,
      color: "#3b82f6",
      ruta: "/pagos/extraordinario",
      tipo_pago: "SERVICIOS",
      ejemplos: ["Luz", "Internet", "Telefonía", "Hosting"]
    },
    {
      id: "mantenimiento",
      titulo: "Mantenimiento",
      descripcion: "Reparaciones y mantenimiento de equipos",
      icono: Wrench,
      color: "#8b5cf6",
      ruta: "/pagos/extraordinario",
      tipo_pago: "MANTENIMIENTO",
      ejemplos: ["Reparación de equipos", "Service preventivo", "Limpieza", "Calibración"]
    },
    {
      id: "otro",
      titulo: "Otro Movimiento",
      descripcion: "Ingresos o egresos no clasificados",
      icono: DollarSign,
      color: "#64748b",
      ruta: "/pagos/extraordinario",
      tipo_pago: "OTRO_EGRESO",
      ejemplos: ["Ingreso extraordinario", "Gasto imprevisto", "Otros conceptos"]
    }
  ];

  function handleSeleccion(tipo) {
    if (tipo.id === "alquiler") {
      navigate(tipo.ruta);
    } else {
      navigate(tipo.ruta, { 
        state: { 
          tipo_pago_inicial: tipo.tipo_pago,
          titulo: tipo.titulo,
          color: tipo.color
        } 
      });
    }
  }

  return (
    <Layout title="Registrar Nuevo Pago">
      <div className="ent-card" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
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
              marginBottom: 20,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1e293b'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            <ArrowLeft size={18} />
            Volver a pagos
          </button>

          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: 32, 
              fontWeight: 700, 
              marginBottom: 12, 
              color: '#1e293b',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Registrar Nuevo Pago
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
              Seleccioná el tipo de pago que querés registrar
            </p>
          </div>
        </div>

        {/* Grid de opciones */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24
        }}>
          {tiposPago.map((tipo) => {
            const Icono = tipo.icono;
            return (
              <div
                key={tipo.id}
                onClick={() => handleSeleccion(tipo)}
                style={{
                  background: "white",
                  border: "2px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 24,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tipo.color;
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = `0 20px 40px ${tipo.color}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                }}
              >
                {/* Decoración de fondo */}
                <div style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  background: `linear-gradient(135deg, ${tipo.color}15 0%, ${tipo.color}05 100%)`,
                  borderRadius: "50%",
                  pointerEvents: "none"
                }} />

                {/* Contenido */}
                <div style={{ position: "relative", zIndex: 1 }}>
                  {/* Icono y flecha */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    justifyContent: "space-between",
                    marginBottom: 16 
                  }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      background: `linear-gradient(135deg, ${tipo.color} 0%, ${tipo.color}dd 100%)`,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 8px 16px ${tipo.color}30`
                    }}>
                      <Icono size={28} color="white" strokeWidth={2.5} />
                    </div>
                    
                    <div style={{
                      width: 32,
                      height: 32,
                      background: `${tipo.color}15`,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: 'all 0.3s ease'
                    }}>
                      <ArrowRight size={18} color={tipo.color} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Título */}
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 20, 
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: 8,
                    lineHeight: 1.3
                  }}>
                    {tipo.titulo}
                  </h3>

                  {/* Descripción */}
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: "#64748b",
                    lineHeight: 1.6,
                    marginBottom: 16
                  }}>
                    {tipo.descripcion}
                  </p>

                  {/* Divider */}
                  <div style={{
                    height: 1,
                    background: '#e2e8f0',
                    marginBottom: 16
                  }} />

                  {/* Ejemplos */}
                  <div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#94a3b8",
                      letterSpacing: "0.5px",
                      marginBottom: 10
                    }}>
                      Ejemplos
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {tipo.ejemplos.slice(0, 3).map((ejemplo, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <div style={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: tipo.color,
                            flexShrink: 0
                          }} />
                          <span style={{
                            fontSize: 13,
                            color: "#64748b",
                            lineHeight: 1.4
                          }}>
                            {ejemplo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info adicional */}
        <div style={{
          marginTop: 48,
          padding: 24,
          background: "linear-gradient(135deg, #667eea10 0%, #764ba210 100%)",
          borderRadius: 16,
          border: "2px solid #667eea20",
          textAlign: "center"
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                Recordá tener una caja abierta
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Podés abrir una caja desde <strong style={{ color: '#667eea' }}>Gestión de Caja</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default SeleccionTipoPago;