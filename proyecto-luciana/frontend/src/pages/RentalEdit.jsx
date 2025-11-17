import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  Shield,
  AlertCircle,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const GARANTIA_COLORS = {
  pendiente: "#FFD700",
  devuelta: "#4CAF50",
  aplicada: "#FF5722",
};

export default function RentalEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [alquiler, setAlquiler] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [toast, setToast] = useState(null);

  const pushToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const resAlq = await axios.get(`/api/alquileres/${id}/`);
      setAlquiler(resAlq.data);

      const resRes = await axios.get(`/api/alquileres/${id}/resumen/`);
      setResumen(resRes.data);
    } catch (e) {
      pushToast("error", "No se pudieron cargar los datos del alquiler.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const finalizarAlquiler = async () => {
    if (
      !window.confirm(
        "¿Finalizar este alquiler?\n\nEsto calculará automáticamente la garantía según los incidentes y generará los pagos correspondientes."
      )
    ) {
      return;
    }

    try {
      setFinalizando(true);
      const { data } = await axios.post(`/api/alquileres/${id}/finalizar/`);

      try {
        const bc = new BroadcastChannel("dashboard");
        bc.postMessage("invalidate");
        bc.close();
      } catch {}

      pushToast("success", data.detail || "Alquiler finalizado correctamente.");
      
      await cargarDatos();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "No se pudo finalizar el alquiler.";
      pushToast("error", msg);
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ maxWidth: 1100 }}>
          <p className="muted">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!alquiler || !resumen) {
    return (
      <Layout>
        <div className="card" style={{ maxWidth: 1100 }}>
          <p style={{ color: "#FF5722" }}>No se encontró el alquiler.</p>
          <Link to="/alquileres" className="btn" style={{ marginTop: 12 }}>
            Volver a alquileres
          </Link>
        </div>
      </Layout>
    );
  }

  const puedeActuar = alquiler.puede_finalizar && !alquiler.tiene_incidentes_abiertos;
  const garantiaColor = GARANTIA_COLORS[alquiler.garantia_estado] || "#999";

  return (
    <Layout>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#4CAF50" : "#F44336",
            color: "white",
            padding: "12px 20px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header con degradado */}
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: 32,
            borderRadius: "16px 16px 0 0",
            marginBottom: 2,
          }}
        >
          <Link
            to="/alquileres"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "white",
              textDecoration: "none",
              marginBottom: 16,
              opacity: 0.9,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.opacity = "1"}
            onMouseLeave={(e) => e.target.style.opacity = "0.9"}
          >
            <ArrowLeft size={16} /> Volver a alquileres
          </Link>
          <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>
            Alquiler #{id}
          </h2>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Estado: {alquiler.estado.toUpperCase()}
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Garantía: <span style={{ color: garantiaColor }}>
                {alquiler.garantia_estado.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        {/* Alerta de incidentes */}
        {resumen.incidentes_abiertos > 0 && (
          <div
            style={{
              background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
              color: "white",
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 2,
            }}
          >
            <AlertTriangle size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                {resumen.incidentes_abiertos} Incidente(s) Abierto(s)
              </div>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Debes resolver todos los incidentes antes de finalizar el alquiler.
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards principales */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 2,
            marginBottom: 2,
          }}
        >
          {/* Total del Alquiler */}
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: 28,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <DollarSign size={24} />
                <span style={{ fontSize: 14, opacity: 0.9, fontWeight: 600 }}>
                  Total del Alquiler
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                {fmt(resumen.totales.total_alquiler)}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                right: -15,
                bottom: -15,
                opacity: 0.1,
              }}
            >
              <DollarSign size={100} />
            </div>
          </div>

          {/* Seña Pagada */}
          <div
            style={{
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              padding: 28,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <CheckCircle size={24} />
                <span style={{ fontSize: 14, opacity: 0.9, fontWeight: 600 }}>
                  Seña Pagada
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                {fmt(resumen.totales.senia_pagada)}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                right: -15,
                bottom: -15,
                opacity: 0.1,
              }}
            >
              <CheckCircle size={100} />
            </div>
          </div>

          {/* Saldo Pendiente */}
          <div
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              padding: 28,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <TrendingUp size={24} />
                <span style={{ fontSize: 14, opacity: 0.9, fontWeight: 600 }}>
                  Saldo Pendiente
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                {fmt(resumen.totales.saldo_pendiente)}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                right: -15,
                bottom: -15,
                opacity: 0.1,
              }}
            >
              <TrendingUp size={100} />
            </div>
          </div>

          {/* Garantía Cobrada */}
          <div
            style={{
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              padding: 28,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Shield size={24} />
                <span style={{ fontSize: 14, opacity: 0.9, fontWeight: 600 }}>
                  Garantía Cobrada
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                {fmt(resumen.totales.garantia_cobrada)}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                right: -15,
                bottom: -15,
                opacity: 0.1,
              }}
            >
              <Shield size={100} />
            </div>
          </div>
        </div>

        {/* Información del pedido y cliente */}
        <div className="card" style={{ marginBottom: 16, borderRadius: "0 0 0 0" }}>
          <h4
            style={{
              marginTop: 0,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <User size={24} />
            Información del Cliente y Pedido
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "#252525",
                padding: 16,
                borderRadius: 10,
                border: "1px solid #333",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <User size={18} color="#999" />
                <span style={{ fontSize: 13, color: "#999" }}>Cliente</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{resumen.cliente}</div>
            </div>

            {alquiler.pedido && (
              <div
                style={{
                  background: "#252525",
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid #333",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <ExternalLink size={18} color="#999" />
                  <span style={{ fontSize: 13, color: "#999" }}>Pedido Vinculado</span>
                </div>
                <Link
                  to={`/pedidos/${alquiler.pedido}`}
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#FFD700",
                    textDecoration: "none",
                  }}
                >
                  #{alquiler.pedido}
                </Link>
              </div>
            )}

            <div
              style={{
                background: "#252525",
                padding: 16,
                borderRadius: 10,
                border: "1px solid #333",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CreditCard size={18} color="#999" />
                <span style={{ fontSize: 13, color: "#999" }}>Forma de Pago</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {resumen.forma_pago || "No especificada"}
              </div>
            </div>
          </div>
        </div>

        {/* Costo de incidentes (si existe) */}
        {resumen.totales.costo_incidentes > 0 && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 87, 34, 0.1) 0%, rgba(255, 87, 34, 0.2) 100%)",
              border: "2px solid rgba(255, 87, 34, 0.3)",
              padding: 24,
              borderRadius: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <AlertCircle size={40} color="#FF5722" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4, color: "#FF5722" }}>
                Costo de Incidentes
              </div>
              <div style={{ fontSize: 14, color: "#999" }}>
                Se aplicaron cargos por daños, pérdidas o incidentes durante el alquiler
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#FF5722" }}>
              {fmt(resumen.totales.costo_incidentes)}
            </div>
          </div>
        )}

        {/* Productos alquilados */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h4
            style={{
              marginTop: 0,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Package size={24} />
            Productos Alquilados
          </h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(alquiler.items || []).map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.producto_nombre || "—"}</td>
                    <td>{it.cantidad}</td>
                    <td>{fmt(it.precio_unit)}</td>
                    <td style={{ fontWeight: 700, fontSize: 16 }}>{fmt(it.subtotal)}</td>
                  </tr>
                ))}
                {(!alquiler.items || alquiler.items.length === 0) && (
                  <tr>
                    <td colSpan="4" className="muted">
                      Sin productos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info de finalización */}
        {puedeActuar && alquiler.estado !== 'finalizado' && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.2) 100%)",
              border: "2px solid rgba(76, 175, 80, 0.4)",
              padding: 28,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <CheckCircle size={40} color="#4CAF50" />
              <div>
                <h4 style={{ margin: 0, color: "#4CAF50", fontSize: 22 }}>
                  ✓ Listo para Finalizar
                </h4>
                <p style={{ margin: "4px 0 0 0", color: "#999" }}>
                  Este alquiler cumple con todos los requisitos para ser finalizado
                </p>
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.2)",
                padding: 16,
                borderRadius: 8,
              }}
            >
              <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>
                Al finalizar se realizará automáticamente:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
                <li>Cálculo automático de daños según incidentes resueltos</li>
                <li>Aplicación de garantía a daños (si corresponde)</li>
                <li>Devolución de garantía al cliente (total o parcial)</li>
                <li>Generación automática de pagos en caja</li>
                <li>Actualización del estado a FINALIZADO</li>
              </ul>
            </div>
          </div>
        )}

        {/* Estado finalizado */}
        {alquiler.estado === 'finalizado' && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(108, 117, 125, 0.1) 0%, rgba(108, 117, 125, 0.2) 100%)",
              border: "2px solid rgba(108, 117, 125, 0.3)",
              padding: 32,
              borderRadius: 12,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <CheckCircle size={56} style={{ color: "#6c757d", marginBottom: 16 }} />
            <h3 style={{ margin: 0, color: "#6c757d", fontSize: 28 }}>
              Alquiler Finalizado
            </h3>
            <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 16 }}>
              Este alquiler fue finalizado el{" "}
              {alquiler.finalizado_en
                ? new Date(alquiler.finalizado_en).toLocaleString()
                : "—"}
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="card" style={{ borderRadius: "0 0 16px 16px" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {puedeActuar && alquiler.estado !== 'finalizado' && (
              <button
                className="btn"
                onClick={finalizarAlquiler}
                disabled={finalizando}
                style={{
                  background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "14px 28px",
                  border: "none",
                  flex: 1,
                }}
              >
                {finalizando ? "Finalizando..." : "✓ Finalizar Alquiler"}
              </button>
            )}

            {alquiler.pedido && (
              <Link
                to={`/pedidos/${alquiler.pedido}`}
                className="btn"
                style={{
                  background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "14px 28px",
                  border: "none",
                  flex: alquiler.estado === 'finalizado' ? 1 : 'initial',
                }}
              >
                Ver Pedido Completo
              </Link>
            )}

            <Link
              to="/alquileres"
              className="btn"
              style={{
                background: "#333",
                color: "#eee",
                fontWeight: 600,
                fontSize: 16,
                padding: "14px 28px",
                border: "1px solid #444",
              }}
            >
              Volver
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}









