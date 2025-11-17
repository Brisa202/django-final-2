// src/pages/caja/CajaResumen.jsx
export default function CajaResumen({ resumen }) {
  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fecha = (d) => d ? new Date(d).toLocaleString() : '—';

  const gridItem = (label, valor, color = '#333') => (
    <div className="resumen-item">
      <div className="resumen-label">{label}</div>
      <div className="resumen-valor" style={{ color }}>
        {valor}
      </div>
    </div>
  );

  return (
    <div className="caja-resumen-container">
      <div className="resumen-section">
        <h4>💰 Dinero Inicial</h4>
        <div className="resumen-grid">
          {gridItem('Efectivo', fmt(resumen.monto_inicial_efectivo))}
          {gridItem('Transferencias', fmt(resumen.monto_inicial_transferencia))}
          {gridItem(
            'Total Inicial',
            fmt(Number(resumen.monto_inicial_efectivo) + Number(resumen.monto_inicial_transferencia)),
            '#FFD700'
          )}
        </div>
      </div>

      <div className="resumen-section">
        <h4>📥 Ingresos</h4>
        <div className="resumen-grid">
          {gridItem('Efectivo', fmt(resumen.ingresos_efectivo), '#28a745')}
          {gridItem('Transferencias', fmt(resumen.ingresos_transferencia), '#28a745')}
          {gridItem('Total Ingresos', fmt(resumen.total_ingresos), '#28a745')}
        </div>
      </div>

      <div className="resumen-section">
        <h4>📤 Egresos</h4>
        <div className="resumen-grid">
          {gridItem('Efectivo', fmt(resumen.egresos_efectivo), '#dc3545')}
          {gridItem('Transferencias', fmt(resumen.egresos_transferencia), '#dc3545')}
          {gridItem('Total Egresos', fmt(resumen.total_egresos), '#dc3545')}
        </div>
      </div>

      <div className="resumen-section highlight">
        <h4>📊 Balance Teórico</h4>
        <div className="resumen-grid">
          {gridItem('Efectivo', fmt(resumen.balance_efectivo_teorico), '#007bff')}
          {gridItem('Transferencias', fmt(resumen.balance_transferencia_teorico), '#007bff')}
          {gridItem('Balance Total', fmt(resumen.balance_total_teorico), '#FFD700')}
        </div>
      </div>

      <style>{`
        .caja-resumen-container {
          display: grid;
          gap: 16px;
        }

        .resumen-section {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 14px;
        }

        .resumen-section.highlight {
          background: #fffbf0;
          border: 1px solid #FFD700;
        }

        .resumen-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .resumen-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }

        .resumen-item {
          background: white;
          border-radius: 8px;
          padding: 10px;
          border: 1px solid #e0e0e0;
        }

        .resumen-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .resumen-valor {
          font-size: 18px;
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .resumen-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}