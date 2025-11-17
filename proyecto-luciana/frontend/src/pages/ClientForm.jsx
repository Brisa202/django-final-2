import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { confirm, success, error } from './alerts';

const validateCUIT = (cuit) => {
  if (!cuit || cuit.length !== 11) return false;
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cuit[i]) * multipliers[i];
  }
  const mod = sum % 11;
  const verifier = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return verifier === parseInt(cuit[10]);
};

const validateDNI = (dni) => /^\d{7,8}$/.test(dni);

const isName = (name) => {
  if (!name || name.trim().length < 2 || name.trim().length > 50) return false;
  return /^[a-záéíóúñü\s\-]+$/i.test(name);
};

const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatPhoneNumber = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  
  if (numbers.startsWith('54')) {
    if (numbers.length <= 2) return `+${numbers}`;
    if (numbers.length <= 3) return `+${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    if (numbers.length <= 5) return `+${numbers.slice(0, 2)} ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    if (numbers.length <= 9) return `+${numbers.slice(0, 2)} ${numbers.slice(2, 3)} ${numbers.slice(3, 5)} ${numbers.slice(5)}`;
    return `+${numbers.slice(0, 2)} ${numbers.slice(2, 3)} ${numbers.slice(3, 5)} ${numbers.slice(5, 9)} ${numbers.slice(9, 13)}`;
  } else {
    if (numbers.startsWith('11') || numbers.startsWith('22') || numbers.startsWith('23') || 
        numbers.startsWith('26') || numbers.startsWith('34') || numbers.startsWith('35') || 
        numbers.startsWith('36') || numbers.startsWith('37') || numbers.startsWith('38')) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
      return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6, 10)}`;
    } else if (numbers.startsWith('2') && numbers.length > 4) {
      if (numbers.length <= 4) return numbers;
      return `${numbers.slice(0, 4)} ${numbers.slice(4, 10)}`;
    } else {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
    }
  }
};

const isValidArPhone = (phone) => {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.startsWith('54') && numbers.length >= 12 && numbers.length <= 13) return true;
  if (numbers.length === 10 && (numbers.startsWith('11') || numbers.startsWith('2') || numbers.startsWith('3'))) return true;
  return false;
};

const isValidStreet = (street) => {
  if (!street || street.trim().length < 3 || street.trim().length > 100) return false;
  return /^[0-9a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-]+$/.test(street);
};

const isValidStreetNumber = (num) => {
  if (!num || num.trim().length === 0) return false;
  return /^[0-9a-zA-Z\s\/\-]+$/.test(num) && num.trim().length <= 10;
};

export default function ClientForm() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [notas, setNotas] = useState('');
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const currentData = { nombre, apellido, documento, telefono, email, calle, numero, notas };
    const changed = JSON.stringify(currentData) !== JSON.stringify(originalData);
    setIsDirty(changed);
  }, [nombre, apellido, documento, telefono, email, calle, numero, notas, originalData]);

  useEffect(() => {
    if (!id) {
      const initial = { nombre: '', apellido: '', documento: '', telefono: '', email: '', calle: '', numero: '', notas: '' };
      setOriginalData(initial);
      return;
    }

    (async () => {
      try {
        const { data } = await axios.get(`/api/clientes/${id}/`);
        let telefonoFormat = data.telefono || '';
        if (telefonoFormat) telefonoFormat = formatPhoneNumber(telefonoFormat);

        const fullDir = (data.direccion || '').trim();
        let direccionCalle = '';
        let direccionNumero = '';
        if (fullDir) {
          const parts = fullDir.split(/\s+/);
          if (parts.length >= 2) {
            direccionNumero = parts.pop();
            direccionCalle = parts.join(' ');
          } else {
            direccionCalle = fullDir;
          }
        }

        const loadedData = {
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          documento: data.documento || '',
          telefono: telefonoFormat,
          email: data.email || '',
          calle: direccionCalle,
          numero: direccionNumero,
          notas: data.notas || '',
        };

        setNombre(loadedData.nombre);
        setApellido(loadedData.apellido);
        setDocumento(loadedData.documento);
        setTelefono(loadedData.telefono);
        setEmail(loadedData.email);
        setCalle(loadedData.calle);
        setNumero(loadedData.numero);
        setNotas(loadedData.notas);
        setOriginalData(loadedData);
      } catch {
        await error({ title: 'No se pudo cargar el cliente' });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const validateField = async (field, value) => {
    switch (field) {
      case 'nombre':
        if (!value || value.trim().length === 0) return 'El nombre es obligatorio';
        if (!isName(value)) return 'El nombre solo debe contener letras (2-50 caracteres)';
        return '';
      case 'apellido':
        if (!value || value.trim().length === 0) return 'El apellido es obligatorio';
        if (!isName(value)) return 'El apellido solo debe contener letras (2-50 caracteres)';
        return '';
      case 'documento':
        if (!value || value.trim().length === 0) return 'El DNI/CUIT es obligatorio';
        const doc = value.trim();
        if (doc.length === 8 || doc.length === 7) {
          if (!validateDNI(doc)) return 'DNI inválido';
        } else if (doc.length === 11) {
          if (!validateCUIT(doc)) return 'CUIT inválido';
        } else {
          return 'Debe ser un DNI (8 dígitos) o CUIT válido (11 dígitos)';
        }
        return '';
      case 'telefono':
        if (!value || value.trim().length === 0) return 'El teléfono es obligatorio';
        if (!isValidArPhone(value)) return 'Formato de teléfono inválido';
        return '';
      case 'email':
        if (!value || value.trim().length === 0) return 'El email es obligatorio';
        if (!isEmail(value)) return 'Formato de email inválido';
        return '';
      case 'calle':
        if (!value || value.trim().length === 0) return 'La calle es obligatoria';
        if (!isValidStreet(value)) return 'Nombre de calle inválido';
        return '';
      case 'numero':
        if (!value || value.trim().length === 0) return 'El número es obligatorio';
        if (!isValidStreetNumber(value)) return 'Número inválido';
        return '';
      case 'notas':
        if (value && value.length > 500) return 'Las notas no pueden superar los 500 caracteres';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = async (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = eval(field);
    const error = await validateField(field, value);
    setErrs(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = async (field, value, setter) => {
    setter(value);
    if (touched[field]) {
      const error = await validateField(field, value);
      setErrs(prev => ({ ...prev, [field]: error }));
    }
  };

  const handlePhoneChange = async (value) => {
    const formatted = formatPhoneNumber(value);
    setTelefono(formatted);
    if (touched.telefono) {
      const error = await validateField('telefono', formatted);
      setErrs(prev => ({ ...prev, telefono: error }));
    }
  };

  const handleDocumentoChange = async (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    setDocumento(digits);
    if (touched.documento) {
      const error = await validateField('documento', digits);
      setErrs(prev => ({ ...prev, documento: error }));
    }
  };

  const handleNameChange = async (field, value, setter) => {
    const cleaned = value.replace(/[^a-záéíóúñü\s\-]/gi, '').slice(0, 50);
    setter(cleaned);
    if (touched[field]) {
      const error = await validateField(field, cleaned);
      setErrs(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleCancel = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Cambios sin guardar',
        message: 'Si salís ahora, perderás todos los cambios realizados. ¿Estás seguro?',
        okText: 'Descartar cambios',
        cancelText: 'Continuar editando',
        tone: 'danger',
      });
      if (!ok) return;
    }
    navigate('/clientes');
  };

  const handleBackClick = async (e) => {
    if (isDirty) {
      e.preventDefault();
      const ok = await confirm({
        title: 'Cambios sin guardar',
        message: 'Si volvés ahora, perderás todos los cambios realizados. ¿Estás seguro?',
        okText: 'Descartar cambios',
        cancelText: 'Continuar editando',
        tone: 'danger',
      });
      if (ok) navigate('/clientes');
    }
  };

  const validate = async () => {
    const e = {};
    const nombreErr = await validateField('nombre', nombre);
    if (nombreErr) e.nombre = nombreErr;
    const apellidoErr = await validateField('apellido', apellido);
    if (apellidoErr) e.apellido = apellidoErr;
    const documentoErr = await validateField('documento', documento);
    if (documentoErr) e.documento = documentoErr;
    const telefonoErr = await validateField('telefono', telefono);
    if (telefonoErr) e.telefono = telefonoErr;
    const emailErr = await validateField('email', email);
    if (emailErr) e.email = emailErr;
    const calleErr = await validateField('calle', calle);
    if (calleErr) e.calle = calleErr;
    const numeroErr = await validateField('numero', numero);
    if (numeroErr) e.numero = numeroErr;
    const notasErr = await validateField('notas', notas);
    if (notasErr) e.notas = notasErr;
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const allFields = ['nombre', 'apellido', 'documento', 'telefono', 'email', 'calle', 'numero'];
    const touchedObj = {};
    allFields.forEach(f => touchedObj[f] = true);
    setTouched(touchedObj);

    const eMap = await validate();
    setErrs(eMap);

    if (Object.keys(eMap).length) {
      await error({ 
        title: 'Formulario incompleto', 
        message: 'Por favor corregí los errores marcados antes de continuar.' 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      const telefonoLimpio = telefono.replace(/\D/g, '');
      const telefonoNorm = telefonoLimpio.startsWith('54') ? telefonoLimpio : '54' + telefonoLimpio;
      const direccion = `${calle.trim()} ${numero.trim()}`.trim();

      const payload = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        documento: documento.trim(),
        telefono: telefonoNorm,
        email: email.trim(),
        direccion,
        notas: notas.trim() || '',
        activo: true,
      };

      if (isEdit) {
        await axios.patch(`/api/clientes/${id}/`, payload);
        await success({ title: 'Cambios guardados correctamente' });
        setIsDirty(false);
        navigate('/clientes', { replace: true });
      } else {
        await axios.post('/api/clientes/', payload);
        const goList = await confirm({
          title: 'Cliente creado correctamente',
          message: '',
          okText: 'Volver a la lista',
          cancelText: 'Crear otro cliente',
          tone: 'success',
        });

        const bc = new BroadcastChannel('dashboard');
        bc.postMessage('invalidate');
        bc.close();

        if (goList) {
          setIsDirty(false);
          navigate('/clientes', { replace: true });
        } else {
          setNombre('');
          setApellido('');
          setDocumento('');
          setTelefono('');
          setEmail('');
          setCalle('');
          setNumero('');
          setNotas('');
          setErrs({});
          setTouched({});
          setIsDirty(false);
          const initial = { nombre: '', apellido: '', documento: '', telefono: '', email: '', calle: '', numero: '', notas: '' };
          setOriginalData(initial);
        }
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        setErrs(prev => ({ ...prev, ...data }));
      }
      const m = data ? JSON.stringify(data) : err.message;
      await error({ title: 'No se pudo guardar el cliente', message: m });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = !Object.values(errs).some(e => e) && 
    nombre.trim() && apellido.trim() && documento.trim() &&
    telefono.trim() && email.trim() && calle.trim() && numero.trim();

  if (!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">Solo administradores pueden gestionar clientes.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
          <p className="muted">Cargando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
        <div style={{ marginBottom: 32 }}>
          <Link to="/clientes" onClick={handleBackClick} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, color: '#666',
            textDecoration: 'none', fontSize: 14, marginBottom: 16, transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = '#000'}
          onMouseLeave={(e) => e.target.style.color = '#666'}>
            <ArrowLeft size={16} /> Volver a clientes
          </Link>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h1>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gap: 24, marginBottom: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Nombre</label>
                <input type="text" value={nombre}
                  onChange={e => handleNameChange('nombre', e.target.value, setNombre)}
                  onBlur={() => handleBlur('nombre')}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    border: errs.nombre && touched.nombre ? '2px solid #EF4444' : '1px solid #D1D5DB',
                    borderRadius: 8, background: '#fff', color: '#1a1a1a',
                    outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { if (!errs.nombre) e.target.style.borderColor = '#c9a961'; }}
                />
                {errs.nombre && touched.nombre && (
                  <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.nombre}</div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Apellido</label>
                <input type="text" value={apellido}
                  onChange={e => handleNameChange('apellido', e.target.value, setApellido)}
                  onBlur={() => handleBlur('apellido')}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    border: errs.apellido && touched.apellido ? '2px solid #EF4444' : '1px solid #D1D5DB',
                    borderRadius: 8, background: '#fff', color: '#1a1a1a',
                    outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { if (!errs.apellido) e.target.style.borderColor = '#c9a961'; }}
                />
                {errs.apellido && touched.apellido && (
                  <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.apellido}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>DNI / CUIT</label>
                <input type="text" value={documento}
                  onChange={e => handleDocumentoChange(e.target.value)}
                  onBlur={() => handleBlur('documento')}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    border: errs.documento && touched.documento ? '2px solid #EF4444' : '1px solid #D1D5DB',
                    borderRadius: 8, background: '#fff', color: '#1a1a1a',
                    outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { if (!errs.documento) e.target.style.borderColor = '#c9a961'; }}
                />
                {errs.documento && touched.documento && (
                  <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.documento}</div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Teléfono</label>
                <input type="text" value={telefono}
                  onChange={e => handlePhoneChange(e.target.value)}
                  onBlur={() => handleBlur('telefono')}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    border: errs.telefono && touched.telefono ? '2px solid #EF4444' : '1px solid #D1D5DB',
                    borderRadius: 8, background: '#fff', color: '#1a1a1a',
                    outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { if (!errs.telefono) e.target.style.borderColor = '#c9a961'; }}
                />
                {errs.telefono && touched.telefono && (
                  <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.telefono}</div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Email</label>
              <input type="email" value={email}
                onChange={e => handleChange('email', e.target.value, setEmail)}
                onBlur={() => handleBlur('email')}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: 15,
                  border: errs.email && touched.email ? '2px solid #EF4444' : '1px solid #D1D5DB',
                  borderRadius: 8, background: '#fff', color: '#1a1a1a',
                  outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => { if (!errs.email) e.target.style.borderColor = '#c9a961'; }}
              />
              {errs.email && touched.email && (
                <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.email}</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Calle</label>
                <input type="text" value={calle}
                  onChange={e => handleChange('calle', e.target.value, setCalle)}
                  onBlur={() => handleBlur('calle')}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    border: errs.calle && touched.calle ? '2px solid #EF4444' : '1px solid #D1D5DB',
                    borderRadius: 8, background: '#fff', color: '#1a1a1a',
                    outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { if (!errs.calle) e.target.style.borderColor = '#c9a961'; }}
                />
                {errs.calle && touched.calle && (
                  <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.calle}</div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Número</label>
                <input type="text" value={numero}
                  onChange={e => handleChange('numero', e.target.value, setNumero)}
                  onBlur={() => handleBlur('numero')}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    border: errs.numero && touched.numero ? '2px solid #EF4444' : '1px solid #D1D5DB',
                    borderRadius: 8, background: '#fff', color: '#1a1a1a',
                    outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { if (!errs.numero) e.target.style.borderColor = '#c9a961'; }}
                />
                {errs.numero && touched.numero && (
                  <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.numero}</div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Notas (opcional)</label>
              <textarea value={notas} rows={4}
                onChange={e => handleChange('notas', e.target.value, setNotas)}
                onBlur={() => handleBlur('notas')}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: 15,
                  border: errs.notas ? '2px solid #EF4444' : '1px solid #D1D5DB',
                  borderRadius: 8, background: '#fff', color: '#1a1a1a',
                  outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box',
                  fontFamily: 'inherit', resize: 'vertical'
                }}
                onFocus={(e) => { if (!errs.notas) e.target.style.borderColor = '#c9a961'; }}
              />
              {errs.notas && <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{errs.notas}</div>}
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{notas.length}/500 caracteres</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button type="submit" disabled={saving || !isFormValid}
              style={{
                padding: '14px 32px', fontSize: 15, fontWeight: 600,
                background: (saving || !isFormValid) ? '#E5E7EB' : '#FFD700',
                color: (saving || !isFormValid) ? '#9CA3AF' : '#1a1a1a',
                border: 'none', borderRadius: 8,
                cursor: (saving || !isFormValid) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', opacity: (saving || !isFormValid) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!saving && isFormValid) {
                  e.target.style.background = '#FFC700';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving && isFormValid) {
                  e.target.style.background = '#FFD700';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear cliente')}
            </button>
            
            <button type="button" onClick={handleCancel} disabled={saving}
              style={{
                padding: '14px 32px', fontSize: 15, fontWeight: 600,
                background: '#F3F4F6', color: '#374151', border: 'none',
                borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if (!saving) e.target.style.background = '#E5E7EB'; }}
              onMouseLeave={(e) => { if (!saving) e.target.style.background = '#F3F4F6'; }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

