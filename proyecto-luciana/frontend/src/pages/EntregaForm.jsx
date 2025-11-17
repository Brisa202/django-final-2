import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import { ArrowLeft, Save, CheckCircle2, AlertCircle } from "lucide-react"; 
import { useAuth } from "../context/AuthContext";
import { confirm } from './alerts'; // <-- IMPORTACIÓN DEL ALERT PERSONALIZADO

// ====================== HELPERS ======================
// Función para formatear fechas a YYYY-MM-DDTHH:MI
const formatInputDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const ESTADOS_CONFIG = {
  pendiente: { color: "#f59e0b", bg: "#fef3c7", label: "Pendiente", icon: CheckCircle2 },
  en_camino: { color: "#3b82f6", bg: "#dbeafe", label: "En camino", icon: CheckCircle2 },
  entregado: { color: "#10b981", bg: "#d1fae5", label: "Entregado", icon: CheckCircle2 },
  no_entregado: { color: "#ef4444", bg: "#fee2e2", label: "No entregado", icon: AlertCircle },
  cancelado: { color: "#6b7280", bg: "#f3f4f6", label: "Cancelado", icon: AlertCircle },
};

const initialFormState = {
  alquiler_id: "",
  fecha_hora_entrega: "",
  direccion: "",
  responsable_principal_id: "",
  responsable_principal_nombre: "",
  estado_entrega: "pendiente",
  fecha_hora_entrega_real: "",
};

// ====================== COMPONENTE ======================
export default function EntregaForm() {
  const navigate = useNavigate();
  const { id: rawId } = useParams();

  const id = rawId && rawId !== "undefined" ? rawId : null;
  const isEdit = !!id;

  const { isAdmin } = useAuth();

  // -------- Estados --------
  const [alquileres, setAlquileres] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [initialData, setInitialData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // -------- Memos y Helpers --------
  const choferes = useMemo(() => {
    const detect = (emp) => {
      const raw = `${emp.rol || emp.cargo || emp.puesto || ""}`.toLowerCase();
      return raw.includes("chofer") || raw.includes("driver");
    };
    const filt = empleados.filter(detect);
    return filt.length ? filt : empleados;
  }, [empleados]);

  const selectedAlquiler = useMemo(
    () => alquileres.find((a) => a.id === Number(form.alquiler_id)),
    [alquileres, form.alquiler_id]
  );
  
  const isRetiro = selectedAlquiler?.tipo_entrega === "retiro";
  const isEnvio = selectedAlquiler?.tipo_entrega === "envio";

  // Lógica para detectar si hay cambios o datos en el formulario
  const hasDataOrChanges = useMemo(() => {
    if (!isEdit) {
      // Modo Crear: Detectar si se ha llenado algo
      return (
        !!form.alquiler_id || 
        !!form.fecha_hora_entrega || 
        !!form.direccion || 
        !!form.responsable_principal_id || 
        form.estado_entrega !== 'pendiente'
      );
    }
    // Modo Editar: Comparar estado actual con datos iniciales
    // Se excluye la fecha_hora_entrega_real de la comparación, ya que es un campo de estado.
    const currentFormCmp = { ...form, fecha_hora_entrega_real: undefined };
    const initialDataCmp = { ...initialData, fecha_hora_entrega_real: undefined };
    return JSON.stringify(currentFormCmp) !== JSON.stringify(initialDataCmp);
  }, [form, initialData, isEdit]);

  // -------- Carga de datos --------
  useEffect(() => {
    (async () => {
      try {
        if (!isEdit && !isAdmin) {
          navigate("/entregas", { replace: true });
          return;
        }

        if (isAdmin) {
          const [alqRes, empRes] = await Promise.all([
            axios.get("/api/alquileres/"),
            axios.get("/api/gestion-empleados/"),
          ]);
          setAlquileres(alqRes.data);
          setEmpleados(empRes.data);
        }

        if (isEdit && id) {
             const { data } = await axios.get(`/api/entregas/${id}/`);

             const loadedForm = {
                 alquiler_id: String(data.alquiler_id || ""),
                 fecha_hora_entrega: formatInputDate(data.fecha_hora_entrega),
                 direccion: data.direccion || "",
                 responsable_principal_id:
                     String(data.responsable_principal?.id_empleados || ""),
                 responsable_principal_nombre: data.responsable_principal
                     ? `${data.responsable_principal.apellido}, ${data.responsable_principal.nombre}`
                     : "",
                 estado_entrega: data.estado_entrega || "pendiente",
                 fecha_hora_entrega_real: data.fecha_hora_entrega_real || "",
             };

             setForm(loadedForm);
             setInitialData(loadedForm);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg("Error al cargar datos de la entrega.");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [id, isAdmin, isEdit]);

  const disableFields = !isAdmin && isEdit;

  // -------- Handlers --------
  const handleChange = (e) => {
    if (disableFields) return;
    const { name, value } = e.target;

    if (name === "alquiler_id") {
      const alq = alquileres.find((a) => a.id === Number(value));
      const isAlqEnvio = alq?.tipo_entrega === "envio";
      const isAlqRetiro = alq?.tipo_entrega === "retiro";

      let newDireccion = form.direccion;
      let newFechaHora = form.fecha_hora_entrega;

      if (isAlqEnvio) {
          newDireccion = alq?.direccion_evento || "";
          newFechaHora = alq?.fecha_hora_evento
              ? formatInputDate(alq.fecha_hora_evento)
              : "";
      } else if (isAlqRetiro) {
          newDireccion = "Retiro en local"; 
          newFechaHora = alq?.fecha_hora_evento 
              ? formatInputDate(alq.fecha_hora_evento) 
              : form.fecha_hora_entrega;
      }

      setForm((prev) => ({
        ...prev,
        alquiler_id: value,
        direccion: newDireccion,
        fecha_hora_entrega: newFechaHora,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Lógica de alerta personalizada para volver atrás
  const handleAttemptBack = async () => {
    // 1. Modo Creación
    if (!isEdit) {
      if (!hasDataOrChanges) {
        navigate("/entregas");
        return;
      }

      const ok = await confirm({
        title: 'Tenés datos cargados en el formulario',
        message: 'Si salís ahora, los datos cargados se van a perder.\n\n¿Seguro que querés volver a entregas?',
        okText: 'Salir igualmente',
        cancelText: 'Cancelar',
        tone: 'warn',
      });

      if (ok) navigate("/entregas");
      return;
    }

    // 2. Modo Edición
    if (!hasDataOrChanges) {
      // Si no hay cambios, navegamos directamente
      navigate("/entregas");
      return;
    }

    // Si hay cambios en modo edición, preguntamos
    const ok = await confirm({
        title: 'Tenés cambios sin guardar',
        message: 'Si salís ahora, las modificaciones realizadas se van a perder.\n\n¿Seguro que querés volver a entregas?',
        okText: 'Salir igualmente',
        cancelText: 'Cancelar',
        tone: 'warn',
    });

    if (ok) navigate("/entregas");
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isAdmin) {
      setErrorMsg("Solo un administrador puede guardar cambios de entrega.");
      return;
    }

    const isDirectionRequired = !isRetiro;
    if (!form.alquiler_id || !form.fecha_hora_entrega || (isDirectionRequired && !form.direccion)) {
      setErrorMsg("Completá alquiler, fecha/hora, y dirección (si no es retiro en local).");
      return;
    }

    const payload = {
      alquiler_id: form.alquiler_id,
      fecha_hora_entrega: form.fecha_hora_entrega,
      direccion: isRetiro ? "Retiro en local" : form.direccion, 
      estado_entrega: form.estado_entrega,
      responsable_principal_id: form.responsable_principal_id || null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await axios.put(`/api/entregas/${id}/`, payload);
      } else {
        await axios.post("/api/entregas/", payload);
      }
      navigate("/entregas");
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo guardar la entrega.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmarEntrega = async () => {
    setErrorMsg("");
    try {
      setUpdating(true);
      const { data } = await axios.post(`/api/entregas/${id}/confirmar/`);
      const updatedForm = {
        ...form,
        estado_entrega: data.estado_entrega || "entregado",
        fecha_hora_entrega_real: data.fecha_hora_entrega_real,
      };
      setForm(updatedForm);
      setInitialData(updatedForm); // Actualiza initialData después de un cambio de estado exitoso
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.detail ||
          "No se pudo marcar como entregada (permiso o responsable incorrecto)."
      );
    } finally {
      setUpdating(false);
    }
  };

  const isFormValid = !!form.alquiler_id && !!form.fecha_hora_entrega && (isRetiro || !!form.direccion);

  // -------- Render Loading/Restricción --------
  if (loading) {
    return (
      <Layout title="Entregas">
        <div
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#64748b", fontSize: "18px" }}>Cargando...</p>
        </div>
      </Layout>
    );
  }

  // -------- Render Condicionales --------
  const puedeConfirmar =
    isEdit &&
    !!id &&
    form.estado_entrega !== "entregado" &&
    form.estado_entrega !== "cancelado" &&
    !!form.responsable_principal_id;

  const shouldDisableDireccion = isEnvio || isRetiro;
  const shouldDisableFechaHora = isEnvio;

  // -------- Estilos Inline (para replicar tu estilo) --------
  const styles = {
    backButton: {
      background: "transparent",
      border: "none",
      padding: "8px 0px",
      cursor: (saving || updating) ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#475569",
      fontSize: "14px",
      fontWeight: "600",
      opacity: (saving || updating) ? 0.5 : 1,
    },
    headerTitle: {
      fontSize: "32px",
      fontWeight: "800",
      color: "#1e293b",
      margin: 0,
    },
    card: {
      background: "white",
      borderRadius: "20px",
      padding: "32px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      marginBottom: "24px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "8px",
    },
    input: (disabled) => ({
      width: "100%",
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0", 
      fontSize: "14px",
      outline: "none",
      background: disabled ? "#f8fafc" : "white",
      cursor: disabled ? "not-allowed" : "text",
      color: "#1e293b",
    }),
    select: (disabled) => ({
      width: "100%",
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0", 
      fontSize: "14px",
      outline: "none",
      background: disabled ? "#f8fafc" : "white",
      cursor: disabled ? "not-allowed" : "pointer",
      color: "#1e293b",
    }),
    errorAlert: {
        marginTop: "24px",
        background: "#fee2e2",
        border: "2px solid #ef4444",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "14px",
        fontWeight: "500",
        color: "#991b1b",
    },
    buttonPrimary: (disabled) => ({
      padding: "12px 24px",
      borderRadius: "12px",
      border: "none",
      background:
        "linear-gradient(135deg, #FFC107 0%, #FFA000 100%)",
      color: "black",
      fontSize: "15px",
      fontWeight: "600",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(255, 193, 7, 0.4)",
      opacity: disabled ? 0.5 : 1,
    }),
    buttonSecondary: (disabled) => ({
        padding: "12px 24px",
        borderRadius: "12px",
        border: "1px solid #ccc",
        background: "white",
        color: "#64748b",
        fontSize: "15px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
    }),
    buttonConfirm: (disabled) => ({
      padding: "12px 24px",
      borderRadius: "12px",
      border: "none",
      background: "#10b981", 
      color: "white",
      fontSize: "15px",
      fontWeight: "600",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
      opacity: disabled ? 0.7 : 1,
    }),
  };


  // -------- JSX Render --------
  return (
    <Layout title="Entregas">
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          
          <div style={{ marginBottom: "24px", display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleAttemptBack} 
              disabled={saving || updating}
              style={styles.backButton}
            >
              <ArrowLeft size={16} />
              Volver a entregas
            </button>

            <h1 style={styles.headerTitle}>
              {isEdit && id ? `Entrega #${id}` : "Nueva entrega"}
            </h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.card}>
              {/* Alquiler y Fecha */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <label style={styles.label}>Alquiler asociado</label>
                  <select
                    name="alquiler_id"
                    value={form.alquiler_id}
                    onChange={handleChange}
                    disabled={isEdit || disableFields} 
                    style={styles.select(isEdit || disableFields)}
                  >
                    {!isEdit && <option value="">Seleccionar alquiler...</option>}
                    {isEdit ? (
                      <option value={form.alquiler_id}>
                        {`Alquiler #${form.alquiler_id}`}
                      </option>
                    ) : (
                      alquileres.map((a) => (
                        <option key={a.id} value={a.id}>
                          {`Alquiler #${a.id} - ${a.cliente_nombre || a.cliente || "Sin nombre"}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Fecha y hora planificada</label>
                  <input
                    type="datetime-local"
                    name="fecha_hora_entrega"
                    value={form.fecha_hora_entrega}
                    onChange={handleChange}
                    disabled={shouldDisableFechaHora || disableFields} 
                    style={styles.input(shouldDisableFechaHora || disableFields)}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div style={{ marginBottom: "24px" }}>
                <label style={styles.label}>Dirección de entrega</label>
                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  disabled={shouldDisableDireccion || disableFields} 
                  placeholder={
                    isRetiro
                      ? "El cliente retira en el local"
                      : "Ej: Av. Belgrano 1234"
                  }
                  style={styles.input(shouldDisableDireccion || disableFields)}
                />
              </div>

              {/* Responsable y Estado */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "24px",
                }}
              >
                <div>
                  <label style={styles.label}>Responsable (chofer)</label>
                  {isAdmin ? (
                    <select
                      name="responsable_principal_id"
                      value={form.responsable_principal_id}
                      onChange={handleChange}
                      style={styles.select(false)}
                    >
                      <option value="">Seleccionar responsable...</option>
                      {choferes.map((emp) => (
                        <option
                          key={emp.id_empleados}
                          value={emp.id_empleados}
                        >
                          {emp.apellido}, {emp.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      readOnly
                      value={
                        form.responsable_principal_nombre ||
                        "Sin responsable asignado"
                      }
                      disabled
                      style={styles.input(true)}
                    />
                  )}
                </div>

                <div>
                  <label style={styles.label}>Estado</label>
                  {isAdmin ? (
                    <select
                      name="estado_entrega"
                      value={form.estado_entrega}
                      onChange={handleChange}
                      style={styles.select(false)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_camino">En camino</option>
                      <option value="entregado">Entregado</option>
                      <option value="no_entregado">No entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  ) : (
                    <input
                      readOnly
                      value={ESTADOS_CONFIG[form.estado_entrega]?.label || form.estado_entrega}
                      disabled
                      style={styles.input(true)}
                    />
                  )}
                </div>
              </div>

              {form.fecha_hora_entrega_real && (
                <div
                  style={{
                    marginTop: "24px",
                    background: "#d1fae5",
                    border: "2px solid #10b981",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <CheckCircle2 size={24} color="#10b981" />
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#065f46",
                      }}
                    >
                      Entrega confirmada
                    </div>
                    <div
                      style={{ fontSize: "13px", color: "#047857" }}
                    >
                      {new Date(
                        form.fecha_hora_entrega_real
                      ).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div style={styles.errorAlert}>
                  <AlertCircle size={24} color="#ef4444" />
                  <div>{errorMsg}</div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {/* Botón Cancelar con alerta */}
              <button
                type="button"
                onClick={handleAttemptBack} 
                disabled={saving || updating}
                style={styles.buttonSecondary(saving || updating)}
              >
                Cancelar
              </button>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving || updating || !isFormValid || (isEdit && !hasDataOrChanges)}
                  style={styles.buttonPrimary(saving || updating || !isFormValid || (isEdit && !hasDataOrChanges))}
                >
                  <Save size={18} />
                  {saving
                    ? "Guardando..."
                    : isEdit
                    ? "Guardar cambios"
                    : "Crear entrega"}
                </button>
              )}

              {puedeConfirmar && isAdmin && ( // Solo Admin puede confirmar
                <button
                  type="button"
                  onClick={handleConfirmarEntrega}
                  disabled={saving || updating}
                  style={styles.buttonConfirm(saving || updating)}
                >
                  <CheckCircle2 size={18} />
                  {updating
                    ? "Confirmando..."
                    : "Marcar como entregado ahora"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}