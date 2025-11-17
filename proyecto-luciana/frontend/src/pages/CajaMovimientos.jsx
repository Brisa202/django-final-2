// src/pages/caja/CajaMovimientos.jsx
import { useEffect, useState } from 'react';
import axios from '../api/axios';

export default function CajaMovimientos({ cajaId }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerPagos = async () => {
      try {
        const { data } = await axios.get(`/api/cajas/${cajaId}/`);
        setPagos(data.pagos || []);
      } catch (err) {
        console.error('Error cargando movimientos:', err);
      } finally {
        setLoading(false);
      }
    };

    obtenerPagos();
    const interval = setInterval(obtenerPagos, 30000);
    return () => clearInterval(interval);
  }, [cajaId]);

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  const fecha = (d) => d ? new Date(d).toLocaleString() : '—';

  const getTipoBadge = (tipo) => {
    const tipos = {
      'SENIA': '🎫 Seña',
      'SALDO': '💵 Saldo',
      'GARANTIA': '🔒 Garantía',
      'DEVOLUCION_GARANTIA': '↩️ Dev. Garantía',
      'APLICACION_GARANTIA': '⚠️ Aplica. Garantía',
      'OTRO_INGRESO': '➕ Otro Ingreso',
      'OTRO_EGRESO': '➖ Otro Egreso',
    };
    return tipos[tipo] || tipo;
  };

  const getSentidoColor = (sentido) => sentido === 'INGRESO' ? '#28a745' : '#dc3545';

  return (
    <div className="caja-movimientos">
      <h4>📋 Movimientos de la Caja</h4>

      {loading ? (
        <div className="muted">Cargando movimientos...</div>
      ) : pagos.length === 0 ? (
        <div className="muted">Sin movimientos aún.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago, i) => (
                <tr key={i}>
                  <td>{fecha(pago.fecha_pago)}</td>
                  <td>{getTipoBadge(pago.tipo_pago)}</td>
                  <td>{pago.metodo_pago}</td>
                  <td style={{ color: getSentidoColor(pago.sentido), fontWeight: 600 }}>
                    {pago.sentido === 'INGRESO' ? '+' : '-'} {fmt(pago.monto)}
                  </td>
                  <td>
                    {pago.pedido_id && `Ped. #${pago.pedido_id}`}
                    {pago.alquiler_id && `Alq. #${pago.alquiler_id}`}
                    {!pago.pedido_id && !pago.alquiler_id && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .caja-movimientos {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 14px;
        }

        .caja-movimientos h4 {
          margin: 0 0 12px 0;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .table thead {
          background: #f0f0f0;
          font-weight: 600;
        }

        .table th,
        .table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .table tbody tr:hover {
          background: #fafafa;
        }

        @media (max-width: 600px) {
          .table {
            font-size: 11px;
          }
          .table th,
          .table td {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}