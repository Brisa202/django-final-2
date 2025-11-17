import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

export default function MovimientosExtraordinarios() {
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoPago, setTipoPago] = useState('COMPRA_INSUMOS');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!monto || !descripcion) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('El monto debe ser un número positivo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/pagos/', {
        tipo_pago: tipoPago,
        metodo_pago: metodoPago,
        monto: montoNum,
        descripcion: descripcion,
        // No enviamos pedido_id ni alquiler_id porque son movimientos extraordinarios
      });

      alert('✅ Movimiento extraordinario registrado correctamente');
      navigate('/caja');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Error al registrar el movimiento';
      setError(errorMsg);
      console.error('Error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const getTipos = () => {
    return [
      { value: 'COMPRA_INSUMOS', label: '🛒 Compra de Insumos', sentido: 'EGRESO' },
      { value: 'PAGO_TRABAJADORES', label: '👷 Pago a Trabajadores', sentido: 'EGRESO' },
      { value: 'SERVICIOS', label: '⚡ Servicios (luz, agua, etc.)', sentido: 'EGRESO' },
      { value: 'MANTENIMIENTO', label: '🔧 Mantenimiento', sentido: 'EGRESO' },
      { value: 'OTRO_EGRESO', label: '➖ Otro Egreso', sentido: 'EGRESO' },
      { value: 'OTRO_INGRESO', label: '➕ Otro Ingreso', sentido: 'INGRESO' },
    ];
  };

  const tipoSeleccionado = getTipos().find(t => t.value === tipoPago);

  return (
    <div className="movimientos-extraordinarios">
      <div className="header">
        <button className="btn-back" onClick={() => navigate('/caja')}>
          ← Volver a Caja
        </button>
        <h2>💸 Registrar Movimiento Extraordinario</h2>
      </div>

      <div className="info-box">
        ℹ️ Use este formulario para registrar gastos operativos (compras, salarios, servicios) 
        u otros ingresos/egresos que no están relacionados con pedidos o alquileres.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Tipo de Movimiento:
            <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}>
              {getTipos().map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </label>
          {tipoSeleccionado && (
            <div className={`sentido-badge ${tipoSeleccionado.sentido.toLowerCase()}`}>
              {tipoSeleccionado.sentido === 'INGRESO' ? '📥 Ingreso' : '📤 Egreso'}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>
            Método de Pago:
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
              <option value="DEBITO">💳 Débito</option>
              <option value="CREDITO">💳 Crédito</option>
              <option value="MERCADOPAGO">💙 MercadoPago</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label>
            Monto ($):
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              required
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            Descripción:
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle del movimiento..."
              rows="4"
              required
            />
          </label>
          <small className="hint">
            Ejemplo: "Compra de pintura blanca y rodillos en Ferretería Central"
          </small>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={() => navigate('/caja')}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Registrando...' : '✓ Registrar Movimiento'}
          </button>
        </div>
      </form>

      <style>{`
        .movimientos-extraordinarios {
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .header h2 {
          margin: 0;
          font-size: 24px;
        }

        .btn-back {
          background: #e0e0e0;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-back:hover {
          background: #d0d0d0;
        }

        .info-box {
          background: #e3f2fd;
          padding: 14px;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
          font-size: 14px;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        form {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
        }

        .sentido-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-top: 8px;
        }

        .sentido-badge.ingreso {
          background: #d4edda;
          color: #155724;
        }

        .sentido-badge.egreso {
          background: #f8d7da;
          color: #721c24;
        }

        .hint {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .error-message {
          padding: 12px;
          background: #f8d7da;
          border: 1px solid #dc3545;
          border-radius: 6px;
          color: #721c24;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
        }

        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #28a745;
          color: white;
        }

        .btn.primary:hover:not(:disabled) {
          background: #218838;
        }

        .btn.secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn.secondary:hover {
          background: #d0d0d0;
        }

        @media (max-width: 768px) {
          .movimientos-extraordinarios {
            padding: 16px;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header h2 {
            font-size: 20px;
          }

          form {
            padding: 16px;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
