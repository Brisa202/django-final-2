// src/pages/alerts.jsx
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

// =======================
// Infra mínima de portal
// =======================
let root, host, queue = [];

function ensureRoot() {
  if (root) return root;
  host = document.createElement("div");
  host.id = "alerts-portal";
  document.body.appendChild(host);
  root = createRoot(host);
  return root;
}

function render() {
  ensureRoot().render(<Renderer modals={queue} />);
}

function push(modal) {
  queue.push(modal);
  render();
}

function pop(result) {
  const m = queue.shift();
  try {
    m?.resolve?.(result);
  } finally {
    render();
  }
}

// =======================
// API pública
// =======================

export function confirm({
  title = "¿Confirmar?",
  message = "",
  okText = "Aceptar",
  cancelText = "Cancelar",
  tone = "warn",
} = {}) {
  return new Promise((resolve) => {
    push({
      kind: "confirm",
      title,
      message,
      okText,
      cancelText,
      tone,
      resolve,
    });
  });
}

export function success({
  title = "Operación exitosa",
  message = "",
  okText = "Entendido",
  timer = 1800,
} = {}) {
  return new Promise((resolve) => {
    push({
      kind: "success",
      title,
      message,
      okText,
      tone: "success",
      timer,
      resolve,
    });
  });
}

export function error({
  title = "Ocurrió un error",
  message = "",
  okText = "Entendido",
  timer = 2200,
} = {}) {
  return new Promise((resolve) => {
    push({
      kind: "error",
      title,
      message,
      okText,
      tone: "danger",
      timer,
      resolve,
    });
  });
}

// =======================
// Renderer global (portal)
// =======================
function Renderer({ modals }) {
  if (!modals.length) return null;
  const m = modals[0];
  return (
    <div className="alrt-overlay">
      <Card modal={m} />
      <style>{css}</style>
    </div>
  );
}

// =======================
// Tarjeta visual de alerta
// =======================
function Card({ modal }) {
  const {
    kind,
    title,
    message,
    okText,
    cancelText,
    tone,
    timer,
  } = modal;

  useEsc(() => pop(kind === "confirm" ? false : true));

  useEffect(() => {
    if ((kind === "success" || kind === "error") && timer) {
      const t = setTimeout(() => {
        pop(true);
      }, timer);
      return () => clearTimeout(t);
    }
  }, [kind, timer]);

  // Colores según el tono
  const iconColor =
    tone === "danger"
      ? "#ef4444"
      : tone === "success"
      ? "#10b981"
      : tone === "warn"
      ? "#f59e0b"
      : "#c9a961";

  const iconBg =
    tone === "danger"
      ? "#fef2f2"
      : tone === "success"
      ? "#f0fdf4"
      : tone === "warn"
      ? "#fffbeb"
      : "#faf8f3";

  return (
    <div className="alrt-card" role="dialog" aria-modal="true">
      <div className="alrt-icon" style={{ color: iconColor, background: iconBg }}>
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {kind === "success" && <path d="M5 13l4 4L19 7" />}
          {kind === "error" && (
            <>
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </>
          )}
          {kind === "confirm" && tone === "danger" && (
            <>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </>
          )}
          {kind === "confirm" && tone !== "danger" && (
            <>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </>
          )}
        </svg>
      </div>

      {title && <h3 className="alrt-title">{title}</h3>}
      {message && <p className="alrt-msg">{message}</p>}

      <div className="alrt-actions">
        {kind === "confirm" && (
          <button
            className="alrt-btn ghost"
            onClick={() => pop(false)}
          >
            {cancelText || "Cancelar"}
          </button>
        )}

        <button
          className={`alrt-btn primary ${tone === "danger" ? "danger" : ""}`}
          onClick={() => pop(true)}
        >
          {okText || "Aceptar"}
        </button>
      </div>
    </div>
  );
}

function useEsc(fn) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") fn();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [fn]);
}

// =======================
// CSS personalizado - Tu diseño
// =======================
const css = `
#alerts-portal { all: initial; }

.alrt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  animation: alrt-fadeIn 0.2s ease;
}

@keyframes alrt-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes alrt-slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.alrt-card {
  width: min(460px, 92vw);
  background: #ffffff;
  color: #1a1a1a;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: alrt-slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.alrt-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.alrt-title {
  font-size: 20px;
  margin: 0 0 8px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.alrt-msg {
  color: #6b7280;
  margin: 0 0 24px;
  line-height: 1.5;
  white-space: pre-line;
  font-size: 14px;
}

.alrt-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 0;
}

.alrt-btn {
  border: 0;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 15px;
  line-height: 1;
}

.alrt-btn.primary {
  background: #c9a961;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(201, 169, 97, 0.3);
}

.alrt-btn.primary:hover {
  background: #b89851;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(201, 169, 97, 0.4);
}

.alrt-btn.primary:active {
  transform: translateY(0);
}

.alrt-btn.primary.danger {
  background: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.alrt-btn.primary.danger:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.alrt-btn.ghost {
  background: #f3f4f6;
  color: #374151;
}

.alrt-btn.ghost:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.alrt-btn.ghost:active {
  transform: translateY(0);
}

/* Modo oscuro (opcional) */
@media (prefers-color-scheme: dark) {
  .alrt-card {
    background: #1f2937;
    color: #f9fafb;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .alrt-title {
    color: #f9fafb;
  }

  .alrt-msg {
    color: #d1d5db;
  }

  .alrt-btn.ghost {
    background: #374151;
    color: #f9fafb;
  }

  .alrt-btn.ghost:hover {
    background: #4b5563;
  }
}
`;

render();