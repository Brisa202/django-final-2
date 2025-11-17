// src/pages/Facturas.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "../api/axios";
import { Search, FileText, User, Calendar, DollarSign, ExternalLink } from "lucide-react";

// Paleta dorada
const GOLD_BG = "#FFF4C2";
const GOLD_BG_SOFT = "#FFF9DD";
const GOLD_BORDER = "#F0C66C";
const GOLD_ACCENT = "#D3A033";
const GOLD_TEXT = "#A66B00";

const ITEMS_PER_PAGE = 8;

export default function Facturas() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchList = async () => {
    try {
      const { data } = await axios.get("/api/facturas/");
      // Puede ser array o paginado
      const arr = Array.isArray(data) ? data : data.results || [];
      setRows(arr);
      setErr("");
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las facturas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((f) =>
      [
        f.numero,
        f.cliente_nombre,
        f.pedido_id,
        f.total,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const money = (n) => `$ ${Number(n || 0).toLocaleString("es-AR")}`;

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }

    return pages;
  };

  return (
    <Layout>
      <div className="card">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={22} color={GOLD_ACCENT} />
              <span>Facturas</span>
            </h3>
            <p className="muted" style={{ marginTop: 4 }}>
              Listado de facturas generadas a partir de los pedidos.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderRadius: 12,
              border: `1px solid ${GOLD_BORDER}`,
              background: GOLD_BG_SOFT,
            }}
          >
            <Search size={16} color={GOLD_TEXT} />
            <input
              placeholder="Buscar por número, cliente o pedido…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                minWidth: 220,
                fontSize: 14,
                color: "#111",
              }}
            />
          </div>
        </div>

        {/* Estado de carga / error */}
        {loading && (
          <p className="muted" style={{ padding: 20 }}>
            Cargando facturas…
          </p>
        )}

        {!loading && err && (
          <p className="muted" style={{ padding: 20 }}>
            {err}
          </p>
        )}

        {!loading && !err && filtered.length === 0 && (
          <p className="muted" style={{ padding: 20 }}>
            No se encontraron facturas {q ? `para "${q}"` : ""}.
          </p>
        )}

        {/* Lista */}
        {!loading && !err && filtered.length > 0 && (
          <>
            <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
              {paginated.map((f) => (
                <div
                  key={f.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 18px rgba(212,160,51,0.25)";
                    e.currentTarget.style.borderColor = GOLD_ACCENT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  {/* Top strip */}
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${GOLD_BG} 0%, ${GOLD_BG_SOFT} 100%)`,
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #f3e2a5",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: 13,
                          color: GOLD_TEXT,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Factura N° {f.numero ?? f.id}
                      </span>
                      <span style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        Pedido #{f.pedido_id ?? "—"}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: GOLD_TEXT,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        <DollarSign size={16} color={GOLD_TEXT} />
                        {money(f.total)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          color: "#9ca3af",
                          marginTop: 2,
                        }}
                      >
                        Total facturado
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div
                    style={{
                      padding: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    {/* Cliente */}
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <User size={12} /> Cliente
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                        {f.cliente_nombre || "—"}
                      </div>
                    </div>

                    {/* Fecha */}
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Calendar size={12} /> Fecha emisión
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                        {f.fecha_emision
                          ? new Date(f.fecha_emision).toLocaleString("es-AR")
                          : "—"}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {f.pedido_id && (
                        <Link
                          to={`/pedidos/${f.pedido_id}`}
                          style={{
                            fontSize: 13,
                            padding: "7px 12px",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            background: "#f9fafb",
                            color: "#374151",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                          }}
                        >
                          <ExternalLink size={14} />
                          Ver pedido
                        </Link>
                      )}

                      {/* Si más adelante querés /facturas/:id, podés usar esto */}
                      {/* <Link
                        to={`/facturas/${f.id}`}
                        style={{
                          fontSize: 13,
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: `1px solid ${GOLD_BORDER}`,
                          background: GOLD_BG,
                          color: GOLD_TEXT,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        <FileText size={14} />
                        Ver factura
                      </Link> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <nav
                aria-label="Navegación de páginas"
                style={{ marginTop: 20, display: "flex", justifyContent: "center" }}
              >
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    gap: 4,
                  }}
                >
                  {/* Primera */}
                  <li>
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `1px solid ${GOLD_BORDER}`,
                        background: currentPage === 1 ? GOLD_BG_SOFT : "#fff",
                        color: currentPage === 1 ? "#9ca3af" : GOLD_TEXT,
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: 13,
                      }}
                    >
                      «
                    </button>
                  </li>

                  {/* Anterior */}
                  <li>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `1px solid ${GOLD_BORDER}`,
                        background: currentPage === 1 ? GOLD_BG_SOFT : "#fff",
                        color: currentPage === 1 ? "#9ca3af" : GOLD_TEXT,
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: 13,
                      }}
                    >
                      ‹
                    </button>
                  </li>

                  {/* Números */}
                  {getPageNumbers().map((page, idx) =>
                    page === "..." ? (
                      <li key={`ellipsis-${idx}`}>
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: `1px solid ${GOLD_BORDER}`,
                            background: "#fff",
                            color: "#9ca3af",
                            fontSize: 13,
                          }}
                        >
                          ...
                        </span>
                      </li>
                    ) : (
                      <li key={page}>
                        <button
                          onClick={() => goToPage(page)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: `1px solid ${GOLD_BORDER}`,
                            background: currentPage === page ? GOLD_BG : "#fff",
                            color: currentPage === page ? GOLD_TEXT : "#c19a6b",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: currentPage === page ? 700 : 500,
                          }}
                        >
                          {page}
                        </button>
                      </li>
                    )
                  )}

                  {/* Siguiente */}
                  <li>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `1px solid ${GOLD_BORDER}`,
                        background: currentPage === totalPages ? GOLD_BG_SOFT : "#fff",
                        color: currentPage === totalPages ? "#9ca3af" : GOLD_TEXT,
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontSize: 13,
                      }}
                    >
                      ›
                    </button>
                  </li>

                  {/* Última */}
                  <li>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `1px solid ${GOLD_BORDER}`,
                        background: currentPage === totalPages ? GOLD_BG_SOFT : "#fff",
                        color: currentPage === totalPages ? "#9ca3af" : GOLD_TEXT,
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontSize: 13,
                      }}
                    >
                      »
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
