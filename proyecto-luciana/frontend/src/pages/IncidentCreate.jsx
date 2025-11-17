import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft, AlertTriangle, Package, FileText } from 'lucide-react';
import { confirm, success, error } from './alerts';

const TIPOS = [
  { value: 'irreparable', label: 'Daño irreparable (rotura, pérdida)' },
  { value: 'reparable',   label: 'Daño reparable (se repone/limpia)' },
];

export default function IncidentCreate(){
  const navigate = useNavigate();

  const [alquileres, setAlquileres] = useState([]);
  const [alquilerId, setAlquilerId] = useState('');
  const [detalles, setDetalles] = useState([]);
  const [detId, setDetId] = useState('');

  const [tipo, setTipo] = useState('irreparable');
  const [cantidad, setCantidad] = useState(1);
  const [descripcion, setDescripcion] = useState('');

  const [saving, setSaving] = useState(false);
  const [abiertos, setAbiertos] = useState([]);

  useEffect(()=>{
    (async ()=>{
      try{
        const { data } = await axios.get('/api/alquileres/', { params:{ ordering: '-id' }});
        setAlquileres(Array.isArray(data) ? data : (data.results || []));
      }catch{/* noop */}
    })();
  }, []);

  useEffect(()=>{
    setDetId('');
    setDetalles([]);
    if(!alquilerId) return;
    (async ()=>{
      try{
        const { data } = await axios.get('/api/det-alquileres/', { params:{ alquiler: alquilerId }});
        setDetalles(Array.isArray(data) ? data : (data.results || []));
      }catch{/* noop */}
    })();
  }, [alquilerId]);

  useEffect(()=>{
    setAbiertos([]);
    if(!detId) return;
    (async ()=>{
      try{
        const { data } = await axios.get('/api/incidentes/', { params:{ det_alquiler: detId }});
        const arr = Array.isArray(data) ? data : (data.results || []);
        setAbiertos(arr.filter(x => x.estado_incidente !== 'resuelto'));
      }catch{/* noop */}
    })();
  }, [detId]);

  const maxDisponible = useMemo(()=>{
    const det = detalles.find(d => String(d.id) === String(detId));
    if(!det) return 0;
    const usados = abiertos.reduce((acc, it) => acc + Number(it.cantidad_afectada || 0), 0);
    return Math.max(0, Number(det.cantidad || 0) - usados);
  }, [detalles, detId, abiertos]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if(!alquilerId || !detId){
      await error({ title: 'Faltan datos', message: 'Seleccioná el alquiler y el ítem.' });
      return;
    }
    if(maxDisponible <= 0){
      await error({ title: 'Sin disponibilidad', message: 'Ese ítem ya no tiene disponibilidad para incidentar.' });
      return;
    }
    const cant = Number(cantidad);
    if(!Number.isInteger(cant) || cant <= 0){
      await error({ title: 'Cantidad inválida', message: 'La cantidad afectada debe ser un entero mayor a 0.' });
      return;
    }
    if(cant > maxDisponible){
      await error({ title: 'Excede disponible', message: `No podés incidentar más de ${maxDisponible}.` });
      return;
    }

    try{
      setSaving(true);
      await axios.post('/api/incidentes/', {
        det_alquiler: Number(detId),
        tipo_incidente: tipo,
        cantidad_afectada: cant,
        descripcion
      });

      const bc = new BroadcastChannel('dashboard');
      bc.postMessage('invalidate'); bc.close();

      const goList = await confirm({
        title: 'Incidente registrado',
        okText: 'Volver a la lista',
        cancelText: 'Registrar otro',
        tone: 'success',
      });

      if (goList) {
        navigate('/incidentes', { replace:true, state:{ created:true } });
      } else {
        setDetId('');
        setAbiertos([]);
        setTipo('irreparable');
        setCantidad(1);
        setDescripcion('');
      }
    }catch(err){
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      await error({ title: 'No se pudo registrar', message: m });
    }finally{
      setSaving(false);
    }
  };

  return (
    <Layout title="Registrar Incidente">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <Link 
          to="/incidentes" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#F57F17',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={16} />
          Volver a clientes
        </Link>

        {/* Card Principal */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {/* Encabezado */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 32px',
            borderBottom: '1px solid #F5F5F5'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={24} color="#000" />
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#212121' }}>
              Nuevo incidente
            </h2>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} style={{ padding: '32px' }}>
            {/* Sección: Información del Alquiler */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <Package size={18} color="#F57F17" />
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#424242',
                  letterSpacing: '0.3px'
                }}>
                  Información del alquiler
                </h3>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Alquiler */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#757575',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Alquiler
                  </label>
                  <select
                    value={alquilerId}
                    onChange={e=>setAlquilerId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '2px solid #E0E0E0',
                      borderRadius: '8px',
                      background: '#FAFAFA',
                      color: '#212121',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <option value="">— Seleccionar alquiler —</option>
                    {alquileres.map(a=>(
                      <option key={a.id} value={a.id}>
                        #{a.id} · {a.cliente || 'sin cliente'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ítem */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#757575',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Ítem
                  </label>
                  <select
                    value={detId}
                    disabled={!alquilerId}
                    onChange={e=>setDetId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '2px solid #E0E0E0',
                      borderRadius: '8px',
                      background: !alquilerId ? '#F5F5F5' : '#FAFAFA',
                      color: !alquilerId ? '#BDBDBD' : '#212121',
                      fontWeight: 500,
                      cursor: !alquilerId ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <option value="">— Seleccionar ítem —</option>
                    {detalles.map(d=>(
                      <option key={d.id} value={d.id}>
                        #{d.id} · {d.producto_nombre || `Prod ${d.producto}`} · x{d.cantidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Sección: Detalles del Incidente */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <FileText size={18} color="#F57F17" />
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#424242',
                  letterSpacing: '0.3px'
                }}>
                  Detalles del incidente
                </h3>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Tipo y Cantidad en dos columnas */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  {/* Tipo */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#757575',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Tipo de incidente
                    </label>
                    <select
                      value={tipo}
                      onChange={e=>setTipo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        border: '2px solid #E0E0E0',
                        borderRadius: '8px',
                        background: '#FAFAFA',
                        color: '#212121',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#757575',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Cantidad afectada
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(0, maxDisponible) || undefined}
                      value={cantidad}
                      onChange={e=>setCantidad(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        border: '2px solid #E0E0E0',
                        borderRadius: '8px',
                        background: '#FAFAFA',
                        color: '#212121',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                    />
                  </div>
                </div>

                {/* Indicador de disponible */}
                {!!detId && (
                  <div style={{
                    background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
                    border: '2px solid #64B5F6',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <AlertTriangle size={18} color="#1976D2" />
                    <span style={{ fontSize: '14px', color: '#0D47A1', fontWeight: 500 }}>
                      Disponible para incidentar: <strong style={{ fontWeight: 700 }}>{maxDisponible}</strong>
                    </span>
                  </div>
                )}

                {/* Descripción */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#757575',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Notas (opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={descripcion}
                    onChange={e=>setDescripcion(e.target.value)}
                    placeholder="Información adicional del incidente..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '2px solid #E0E0E0',
                      borderRadius: '8px',
                      background: '#FAFAFA',
                      color: '#212121',
                      fontWeight: 400,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      transition: 'all 0.2s'
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9E9E9E', 
                    marginTop: '6px',
                    textAlign: 'right'
                  }}>
                    {descripcion.length}/500 caracteres
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              paddingTop: '24px',
              borderTop: '1px solid #F5F5F5'
            }}>
              <button 
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  background: saving 
                    ? '#E0E0E0' 
                    : 'linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)',
                  color: saving ? '#9E9E9E' : '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: saving ? 'none' : '0 2px 8px rgba(255, 167, 38, 0.3)',
                  letterSpacing: '0.5px'
                }}
              >
                {saving ? 'Registrando…' : '✓ Crear incidente'}
              </button>
              
              <Link 
                to="/incidentes" 
                style={{
                  flex: 1,
                  background: '#424242',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: '0.5px'
                }}
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}