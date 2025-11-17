import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import { ArrowLeft, Lock, AlertTriangle, Clock } from "lucide-react";
import { success, error } from "./alerts";

export default function OrderDelivery() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [persona, setPersona] = useState("");
  const [telefono, setTelefono] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isEditable, setIsEditable] = useState(true);
  const [hoursRemaining, setHoursRemaining] = useState(0);

  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`/api/pedidos/${id}/`);
        setDireccion(data.direccion_evento || "");
        setReferencia(data.referencia_entrega || "");
        setPersona(data.persona_recibe || "");
        setTelefono(data.telefono_contacto || "");
        setEventDate(data.fecha_evento || "");

        // Calcular si los campos deben ser editables
        const currentDate = new Date();
        const eventDateObj = new Date(data.fecha_evento);
        const timeDifference = eventDateObj - currentDate;
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        setHoursRemaining(Math.max(0, hoursDifference));

        if (hoursDifference < 72 && hoursDifference > 0) {
          setIsEditable(false);
        }
      } catch (e) {
        error({
          title: "Error",
          message: "No se pudo cargar la información.",
        });
      }
    })();
  }, [id]);

  const formatTimeRemaining = () => {
    if (hoursRemaining <= 0) return "El evento ya pasó";
    const days = Math.floor(hoursRemaining / 24);
    const hours = Math.floor(hoursRemaining % 24);
    return `${days} días y ${hours} horas`;
  };

  const onSave = async () => {
    try {
      await axios.patch(`/api/pedidos/${id}/`, {
        direccion_evento: direccion,
        referencia_entrega: referencia,
        persona_recibe: persona,
        telefono_contacto: telefono,
        tipo_entrega: "envio",
      });

      await success({
        title: "Datos guardados",
        message: "La información de entrega fue actualizada.",
      });

      navigate(`/pedidos/${id}/editar`);
    } catch (e) {
      setMsg("Error al guardar.");
    }
  };

  return (
    <Layout>
      <div style={{ padding: 30, maxWidth: "100%", margin: "0 auto", width: "100%" }}>
        {/* Botón Volver */}
        <button
          onClick={() => navigate(`/pedidos/${id}/editar`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#4b5563",
            fontSize: 14,
            fontWeight: 500,
            background: "none",
            border: "none",
            padding: "8px 14px",
            borderRadius: 12,
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={16} /> Volver a editar pedido
        </button>

        <h2 style={{ marginBottom: 8 }}>Datos de entrega</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          Completá los datos necesarios para la logística.
        </p>

        {/* Alerta de bloqueo - Roja cuando está bloqueado */}
        {!isEditable && hoursRemaining > 0 && (
          <div
            style={{
              backgroundColor: "#FEE2E2",
              border: "2px solid #EF4444",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              display: "flex",
              alignItems: "start",
              gap: 12,
            }}
          >
            <Lock size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  color: "#991B1B",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Campos bloqueados para edición
              </h3>
              <p style={{ color: "#7F1D1D", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                Los campos de <strong>dirección</strong> y <strong>referencia</strong> no pueden
                ser modificados porque faltan menos de 72 horas para el evento.
                <br />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <Clock size={16} />
                  Tiempo restante: <strong>{formatTimeRemaining()}</strong>
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Alerta de advertencia - Amarilla cuando quedan menos de 7 días */}
        {isEditable && hoursRemaining > 0 && hoursRemaining <= 168 && (
          <div
            style={{
              backgroundColor: "#FEF3C7",
              border: "2px solid #F59E0B",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              display: "flex",
              alignItems: "start",
              gap: 12,
            }}
          >
            <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  color: "#92400E",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Recordatorio
              </h3>
              <p style={{ color: "#78350F", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                Los campos de dirección y referencia se bloquearán automáticamente 72 horas antes
                del evento.
                <br />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <Clock size={16} />
                  Tiempo restante para edición: <strong>{formatTimeRemaining()}</strong>
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Dirección */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#394150",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Dirección
            {!isEditable && <Lock size={14} color="#EF4444" />}
          </label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            disabled={!isEditable}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: !isEditable ? "1px solid #FCA5A5" : "1px solid #d1d5db",
              marginTop: 4,
              backgroundColor: !isEditable ? "#FEE2E2" : "#fff",
              color: !isEditable ? "#991B1B" : "#000",
              cursor: !isEditable ? "not-allowed" : "text",
            }}
          />
        </div>

        {/* Referencia */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#394150",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Referencia / piso / depto (opcional)
            {!isEditable && <Lock size={14} color="#EF4444" />}
          </label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            disabled={!isEditable}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: !isEditable ? "1px solid #FCA5A5" : "1px solid #d1d5db",
              marginTop: 4,
              backgroundColor: !isEditable ? "#FEE2E2" : "#fff",
              color: !isEditable ? "#991B1B" : "#000",
              cursor: !isEditable ? "not-allowed" : "text",
            }}
          />
        </div>

        {/* Persona que recibe */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#394150" }}>
            Persona que recibe
          </label>
          <input
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              marginTop: 4,
            }}
          />
        </div>

        {/* Teléfono */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#394150" }}>
            Teléfono de contacto
          </label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              marginTop: 4,
            }}
          />
        </div>

        {msg && <p style={{ color: "red", marginBottom: 10 }}>{msg}</p>}

        <button
          onClick={onSave}
          style={{
            width: "100%",
            padding: 12,
            background: "#FFD700",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Guardar entrega
        </button>
      </div>
    </Layout>
  );
}








