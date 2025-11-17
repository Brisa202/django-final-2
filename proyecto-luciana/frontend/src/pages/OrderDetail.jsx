import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import { 
  ArrowLeft, 
  ExternalLink, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  FileText,
  Package,
  DollarSign,
  Truck,
  Store
} from "lucide-react";
import { error } from "./alerts";

// ❌ ELIMINADA: Se ha quitado la función Badge para eliminar la visualización del estado.

// ---------- Link para archivos ----------
function FileLink({ urlOrPath, label = "archivo" }) {
  if (!urlOrPath) return <span style={{ color: '#9ca3af' }}>—</span>;
  return (
    <a
      href={urlOrPath}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: "#c9a961",
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

// ---------- Etiquetas de servicio ----------
const servicioLabel = (pedido) => {
  const t = (pedido?.tipo_entrega || "").toLowerCase();

  // El backend guarda 'retiro' o 'envio'
  if (t === "retiro") return { text: "Retiro en local", icon: Store, color: "#10b981" };
  if (t === "envio") return { text: "Entrega a domicilio", icon: Truck, color: "#667eea" };

  return { text: pedido?.tipo_entrega || "—", icon: Package, color: "#9ca3af" };
};

const direccionEntregaLabel = (pedido) => {
  if (!pedido) return "—";
  const t = (pedido.tipo_entrega || "").toLowerCase();

  // Si es retiro en local, indicarlo claramente
  if (t === "retiro") {
    return "El cliente retira en el local";
  }

  // Si es entrega a domicilio:
  if (t === "envio") {
    const dirEvento = pedido.direccion_evento || "";
    const refEntrega = pedido.referencia_entrega || "";
    
    if (dirEvento) {
      return refEntrega ? `${dirEvento} (${refEntrega})` : dirEvento;
    }
    
    // Si no hay dirección del evento, usar la del cliente como fallback
    return pedido.cliente_direccion || "Sin dirección especificada";
  }

  // Para cualquier otro tipo
  return "—";
};

// ---------- COMPONENTE PRINCIPAL ----------
export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/pedidos/${id}/`);
      setData(res.data);
    } catch (err) {
      setMsg("No se pudo cargar el pedido.");
      error({ title: "Error", message: "Intentá nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const items = useMemo(() => data?.detalles || [], [data]);

  const totales = useMemo(() => {
    if (!data) return { total: 0, senia: 0, saldoEstimado: 0 };
    const total = Number(data.total || 0);
    const senia = Number(data.senia || 0);
    return { total, senia, saldoEstimado: total - senia };
  }, [data]);

  const alquilerId = data?.alquiler_id || data?.alquiler?.id;
  const servicio = servicioLabel(data);

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
      marginBottom: 20,
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    cardSection: {
      background: '#F9FAFB',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
      border: '1px solid #E5E7EB',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 16,
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    infoRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14,
      fontSize: 14,
      color: '#374151',
    },
    label: {
      fontWeight: 600,
      color: '#6b7280',
      minWidth: 140,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    value: {
      flex: 1,
      color: '#111827',
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
    },
    buttonRow: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
    },
    primaryButton: {
      padding: '12px 24px',
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
    badgeStyle: (color, bgMap) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        background: bgMap,
        color: color,
        border: `1.5px solid ${color}`,
    })
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.outerCard}>
          {/* Header */}
          <div style={styles.headerRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => navigate("/pedidos")} style={styles.backLink}>
                <ArrowLeft size={16} />
                Volver a pedidos
              </button>
              <h1 style={styles.headerTitle}>
                Pedido <span style={{ color: '#c9a961' }}>#{id}</span>
              </h1>
            </div>

            {/* ❌ ELIMINADA: Se ha quitado la línea que mostraba el Badge del estado:
            {data?.estado && <Badge>{data.estado}</Badge>} */}
          </div>

          {/* Error */}
          {msg && !loading && (
            <div style={styles.alertError}>
              <div style={{ fontWeight: 600 }}>{msg}</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              Cargando pedido...
            </div>
          )}

          {/* Contenido */}
          {!loading && data && (
            <>
              {/* Información del cliente */}
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>
                  <User size={18} color="#c9a961" />
                  Información del cliente
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>
                    <User size={14} />
                    Cliente
                  </div>
                  <div style={styles.value}>{data.cliente_nombre || "—"}</div>
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>
                    <Phone size={14} />
                    Teléfono
                  </div>
                  <div style={styles.value}>{data.cliente_telefono || "—"}</div>
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>
                    <MapPin size={14} />
                    Domicilio cliente
                  </div>
                  <div style={styles.value}>{data.cliente_direccion || "—"}</div>
                </div>
              </div>

              {/* Servicio y entrega */}
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>
                  <Truck size={18} color="#c9a961" />
                  Servicio y entrega
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>
                    {React.createElement(servicio.icon, { size: 14 })}
                    Tipo de servicio
                  </div>
                  <div style={styles.value}>
                    <span
                      style={styles.badgeStyle(servicio.color, `${servicio.color}20`)}
                    >
                      {React.createElement(servicio.icon, { size: 14 })}
                      {servicio.text}
                    </span>
                  </div>
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>
                    <MapPin size={14} />
                    Dirección de {data.tipo_entrega === 'envio' ? 'entrega' : 'retiro'}
                  </div>
                  <div style={styles.value}>
                    {direccionEntregaLabel(data)}
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>
                  <Calendar size={18} color="#c9a961" />
                  Fechas del pedido
                </div>

                <div style={styles.grid2}>
                  <div style={styles.infoRow}>
                    <div style={styles.label}>
                      <Calendar size={14} />
                      Fecha evento
                    </div>
                    <div style={styles.value}>
                      {data.fecha_hora_evento
                        ? new Date(data.fecha_hora_evento).toLocaleString("es-AR")
                        : "—"}
                    </div>
                  </div>

                  <div style={styles.infoRow}>
                    <div style={styles.label}>
                      <Calendar size={14} />
                      Fecha devolución
                    </div>
                    <div style={styles.value}>
                      {data.fecha_hora_devolucion
                        ? new Date(data.fecha_hora_devolucion).toLocaleString("es-AR")
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pago */}
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>
                  <DollarSign size={18} color="#c9a961" />
                  Información de pago
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>Método de pago</div>
                  <div style={styles.value}>{data.forma_pago || "—"}</div>
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>Comprobante</div>
                  <div style={styles.value}>
                    <FileLink urlOrPath={data.comprobante_url} label="Ver comprobante" />
                  </div>
                </div>

                {alquilerId && (
                  <div style={styles.infoRow}>
                    <div style={styles.label}>Alquiler generado</div>
                    <div style={styles.value}>
                      <Link 
                        to={`/alquileres/${alquilerId}/editar`}
                        style={{ color: '#c9a961', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Ver alquiler #{alquilerId}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Garantía */}
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>
                  <Shield size={18} color="#c9a961" />
                  Garantía
                </div>

                <div style={styles.grid2}>
                  <div style={styles.infoRow}>
                    <div style={styles.label}>Tipo</div>
                    <div style={styles.value}>{data.garantia_tipo || "—"}</div>
                  </div>

                  <div style={styles.infoRow}>
                    <div style={styles.label}>Estado</div>
                    <div style={styles.value}>
                      {/* Se mantiene un badge básico para el estado de Garantía, si lo necesitas */}
                      <span
                        style={styles.badgeStyle(
                          data.garantia_estado === 'devuelta' ? '#10b981' : '#f97316',
                          data.garantia_estado === 'devuelta' ? 'rgba(52,211,153,0.15)' : 'rgba(253,186,116,0.3)'
                        )}
                      >
                        {data.garantia_estado || "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>Monto</div>
                  <div style={{ ...styles.value, fontSize: 16, fontWeight: 700 }}>
                    ${Number(data.garantia_monto || 0).toLocaleString("es-AR")}
                  </div>
                </div>

                <div style={styles.infoRow}>
                  <div style={styles.label}>Comprobantes</div>
                  <div style={styles.value}>
                    <FileLink urlOrPath={data.garantia_dni_url} label="DNI" />
                    {' · '}
                    <FileLink urlOrPath={data.garantia_serv_url} label="Servicio" />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>
                  <Package size={18} color="#c9a961" />
                  Productos del pedido
                </div>

                <div style={{ overflowX: 'auto', background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                          Producto
                        </th>
                        <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: 100 }}>
                          Cant.
                        </th>
                        <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: 140 }}>
                          Precio unit.
                        </th>
                        <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: 140 }}>
                          Subtotal
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.length > 0 ? (
                        items.map((det) => (
                          <tr key={det.id}>
                            <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#111827' }}>
                              {det.producto_nombre}
                            </td>
                            <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 600 }}>
                              {det.cantidad}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                              ${Number(det.precio_unit).toLocaleString("es-AR")}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 600 }}>
                              ${Number(det.subtotal).toLocaleString("es-AR")}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                            Sin productos en este pedido
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div style={{ ...styles.cardSection, background: 'white', border: '2px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Total items:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    ${totales.total.toLocaleString("es-AR")}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Seña pagada:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                    ${totales.senia.toLocaleString("es-AR")}
                  </span>
                </div>

                <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Saldo estimado:</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#c9a961' }}>
                      ${totales.saldoEstimado.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={styles.buttonRow}>
                {alquilerId && (
                  <button
                    onClick={() => navigate(`/alquileres/${alquilerId}/editar`)}
                    style={styles.primaryButton}
                  >
                    <FileText size={18} />
                    Ver / cerrar alquiler
                  </button>
                )}

                {/* ❌ ELIMINADO: Se quitó el botón Generar Factura PDF */}
                
                <button
                  onClick={() => navigate("/pedidos")}
                  style={styles.secondaryButton}
                >
                  Volver a la lista
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
