// src/pages/EmployeeCreate.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';

import {
  inSet,
  isEmail,
  isRequired,
  notFuture,
  isDniOrCuit,
  isName,
  isUsername,
  getPasswordStrength,
} from '../utils/validators';

import { confirm, success, error } from './alerts';

// ====================== ROLES ======================
const ROLES = [
  { value: 'administrador',  label: 'Administrador',               icon: '👑' },
  { value: 'chofer',         label: 'Chofer',                     icon: '🚚' },
  { value: 'operario_carga', label: 'Operario de carga/descarga', icon: '📦' },
  { value: 'encargado',      label: 'Encargado',                  icon: '📋' },
  { value: 'cajero',         label: 'Cajero',                     icon: '💰' },
];

// también aceptamos “empleado” por si ya hay registros viejos
const ROLES_VALUES = [...ROLES.map(r => r.value), 'empleado'];

// ====================== HELPERS TELÉFONO / DIRECCIÓN ======================
const formatPhoneNumber = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';

  if (numbers.startsWith('54')) {
    if (numbers.length <= 2) return `+${numbers}`;
    if (numbers.length <= 3) return `+${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    if (numbers.length <= 5)
      return `+${numbers.slice(0, 2)} ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `+${numbers.slice(0, 2)} ${numbers.slice(2, 3)} ${numbers.slice(3, 5)} ${numbers.slice(5)}`;
    return `+${numbers.slice(0, 2)} ${numbers.slice(2, 3)} ${numbers.slice(3, 5)} ${numbers.slice(5, 9)} ${numbers.slice(9, 13)}`;
  }

  if (
    numbers.startsWith('11') || numbers.startsWith('22') ||
    numbers.startsWith('23') || numbers.startsWith('26') ||
    numbers.startsWith('29') || numbers.startsWith('34') ||
    numbers.startsWith('35') || numbers.startsWith('36') ||
    numbers.startsWith('37') || numbers.startsWith('38')
  ) {
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6, 10)}`;
  }

  if (numbers.startsWith('2') && numbers.length > 4) {
    if (numbers.length <= 4) return numbers;
    return `${numbers.slice(0, 4)} ${numbers.slice(4, 10)}`;
  }

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
};

const isValidArPhone = (phone) => {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.startsWith('54') && numbers.length >= 12 && numbers.length <= 13) return true;
  if (numbers.length === 10 && (numbers.startsWith('11') || numbers.startsWith('2') || numbers.startsWith('3')))
    return true;
  return false;
};

const isValidStreet = (street) => {
  if (!street || street.trim().length < 3) return false;
  if (street.trim().length > 100) return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-]+$/.test(street);
};

const isValidStreetNumber = (num) => {
  if (!num || num.trim().length === 0) return false;
  return /^[0-9a-zA-Z\s\/\-]+$/.test(num) && num.trim().length <= 10;
};

// ====================== COMPONENTE ======================
export default function EmployeeCreate() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // -------- estados del form --------
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [fechaIng, setFechaIng] = useState('');
  const [fechaEgr, setFechaEgr] = useState('');
  const [rol, setRol] = useState('cajero');
  const [activo, setActivo] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [errs, setErrs] = useState({});
  const [touched, setTouched] = useState({});

  const [initialEditData, setInitialEditData] = useState(null);

  const passwordStrength = getPasswordStrength(password);

  // -------- cargar datos al editar --------
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const { data } = await axios.get(`/api/gestion-empleados/${id}/`);

        const telFormatted = formatPhoneNumber(data.telefono || '');
        let calleInicial = '';
        let numeroInicial = '';

        if (data.direccion) {
          const parts = data.direccion.trim().split(/\s+/);
          if (parts.length >= 2) {
            numeroInicial = parts.pop();
            calleInicial = parts.join(' ');
          } else {
            calleInicial = data.direccion;
          }
        }

        setNombre(data.nombre || '');
        setApellido(data.apellido || '');
        setDni(data.dni || '');
        setTelefono(telFormatted);
        setCalle(calleInicial);
        setNumero(numeroInicial);
        setFechaIng(data.fecha_ingreso || '');
        setFechaEgr(data.fecha_egreso || '');
        setActivo(Boolean(data.activo));
        if (data.rol) setRol(data.rol);

        setInitialEditData({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          dni: data.dni || '',
          telefono: telFormatted,
          calle: calleInicial,
          numero: numeroInicial,
          fechaIng: data.fecha_ingreso || '',
          fechaEgr: data.fecha_egreso || '',
          rol: data.rol || 'cajero',
          activo: Boolean(data.activo),
        });
      } catch {
        setMsg('No se pudo cargar el empleado.');
      }
    })();
  }, [id, isEdit]);

  // -------- validaciones --------
  const validateField = (field, value) => {
    switch (field) {
      case 'username':
        if (!isRequired(value)) return 'Nombre de usuario es obligatorio.';
        if (!isUsername(value)) return 'El usuario debe tener entre 4 y 15 caracteres alfanuméricos.';
        return '';

      case 'email':
        if (!isRequired(value)) return 'Email es obligatorio.';
        if (!isEmail(value)) return 'Email inválido.';
        return '';

      case 'password':
        if (!isRequired(value)) return 'Contraseña es obligatoria.';
        if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        return '';

      case 'confirmPassword':
        if (password !== value) return 'Las contraseñas no coinciden.';
        return '';

      case 'nombre': {
        const v = value.trim();
        if (!isRequired(v)) return 'Nombre es obligatorio.';
        if (!isName(v)) return 'Solo letras, tildes, espacios y guiones.';
        if (v.length > 30) return 'Máximo 30 caracteres.';
        return '';
      }

      case 'apellido': {
        const v = value.trim();
        if (!isRequired(v)) return 'Apellido es obligatorio.';
        if (!isName(v)) return 'Solo letras, tildes, espacios y guiones.';
        if (v.length > 30) return 'Máximo 30 caracteres.';
        return '';
      }

      case 'dni':
        if (!isDniOrCuit(value, true)) return 'DNI (7-8 dígitos) o CUIT (11 dígitos) válido.';
        return '';

      case 'telefono':
        if (!isRequired(value)) return 'Teléfono es obligatorio.';
        if (!isValidArPhone(value)) return 'Formato válido: 11 1234 5678 o +54 9 11 1234 5678.';
        return '';

      case 'calle':
        if (!isRequired(value)) return 'Calle es obligatoria.';
        if (!isValidStreet(value)) return 'Nombre de calle inválido (3-100 caracteres).';
        return '';

      case 'numero':
        if (!isRequired(value)) return 'Número es obligatorio.';
        if (!isValidStreetNumber(value)) return 'Número inválido (ej: 1234, S/N, 1234 A).';
        return '';

      case 'fechaIng':
        if (!isRequired(value) || !notFuture(value)) return 'Fecha requerida y no puede ser futura.';
        return '';

      case 'fechaEgr':
        if (value && !notFuture(value)) return 'Fecha no puede ser futura.';
        return '';

      default:
        return '';
    }
  };

  const fieldValues = {
    username,
    email,
    password,
    confirmPassword,
    nombre,
    apellido,
    dni,
    telefono,
    calle,
    numero,
    fechaIng,
    fechaEgr,
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = fieldValues[field];
    const errorMsg = validateField(field, value);
    setErrs(prev => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrs(prev => ({ ...prev, [field]: errorMsg }));
    }
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setTelefono(formatted);
    if (touched.telefono) {
      const errorMsg = validateField('telefono', formatted);
      setErrs(prev => ({ ...prev, telefono: errorMsg }));
    }
  };

  // ---------- helpers que usan hooks (ANTES de cualquier return condicional) ----------
  const resetCreate = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNombre('');
    setApellido('');
    setDni('');
    setTelefono('');
    setCalle('');
    setNumero('');
    setFechaIng('');
    setFechaEgr('');
    setRol('cajero');
    setActivo(true);
    setMsg('');
    setErrs({});
    setTouched({});
  };

  const createHasData = useMemo(() => {
    if (isEdit) return false;
    return (
      username || email || password || confirmPassword ||
      nombre || apellido || dni || telefono || calle || numero || fechaIng || fechaEgr
    );
  }, [
    isEdit,
    username,
    email,
    password,
    confirmPassword,
    nombre,
    apellido,
    dni,
    telefono,
    calle,
    numero,
    fechaIng,
    fechaEgr,
  ]);

  const editForm = useMemo(
    () => ({
      nombre,
      apellido,
      dni,
      telefono,
      calle,
      numero,
      fechaIng,
      fechaEgr,
      rol,
      activo,
    }),
    [nombre, apellido, dni, telefono, calle, numero, fechaIng, fechaEgr, rol, activo]
  );

  const isEditDirty = useMemo(() => {
    if (!isEdit || !initialEditData) return false;
    return JSON.stringify(editForm) !== JSON.stringify(initialEditData);
  }, [isEdit, editForm, initialEditData]);

  const validate = () => {
    const e = {};

    if (!isEdit) {
      const usernameErr = validateField('username', username);
      if (usernameErr) e.username = usernameErr;

      const emailErr = validateField('email', email);
      if (emailErr) e.email = emailErr;

      const passwordErr = validateField('password', password);
      if (passwordErr) e.password = passwordErr;

      const confirmErr = validateField('confirmPassword', confirmPassword);
      if (confirmErr) e.confirmPassword = confirmErr;
    }

    const nombreErr = validateField('nombre', nombre);
    if (nombreErr) e.nombre = nombreErr;

    const apellidoErr = validateField('apellido', apellido);
    if (apellidoErr) e.apellido = apellidoErr;

    const dniErr = validateField('dni', dni);
    if (dniErr) e.dni = dniErr;

    const telefonoErr = validateField('telefono', telefono);
    if (telefonoErr) e.telefono = telefonoErr;

    const calleErr = validateField('calle', calle);
    if (calleErr) e.calle = calleErr;

    const numeroErr = validateField('numero', numero);
    if (numeroErr) e.numero = numeroErr;

    const fechaIngErr = validateField('fechaIng', fechaIng);
    if (fechaIngErr) e.fecha_ingreso = fechaIngErr;

    const fechaEgrErr = validateField('fechaEgr', fechaEgr);
    if (fechaEgrErr) e.fecha_egreso = fechaEgrErr;

    if (!inSet(rol, ROLES_VALUES)) e.rol = 'Rol inválido.';

    return e;
  };

  const handleBack = async () => {
    // Alta
    if (!isEdit) {
      if (!createHasData) {
        navigate('/empleados');
        return;
      }

      const ok = await confirm({
        title: 'Tenés datos cargados en el formulario',
        message:
          'Si salís ahora, los datos cargados se van a perder.\n\n¿Seguro que querés volver a empleados?',
        okText: 'Salir igualmente',
        cancelText: 'Cancelar',
        tone: 'warn',
      });

      if (ok) navigate('/empleados');
      return;
    }

    // Edición
    if (!isEditDirty) {
      navigate('/empleados');
      return;
    }

    const ok = await confirm({
      title: 'Tenés cambios sin guardar',
      message:
        'Si salís ahora, las modificaciones realizadas se van a perder.\n\n¿Seguro que querés volver a empleados?',
      okText: 'Salir igualmente',
      cancelText: 'Cancelar',
      tone: 'warn',
    });

    if (ok) navigate('/empleados');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    const allFields = !isEdit
      ? [
          'username',
          'email',
          'password',
          'confirmPassword',
          'nombre',
          'apellido',
          'dni',
          'telefono',
          'calle',
          'numero',
          'fechaIng',
        ]
      : ['nombre', 'apellido', 'dni', 'telefono', 'calle', 'numero', 'fechaIng'];

    const touchedObj = {};
    allFields.forEach(f => { touchedObj[f] = true; });
    setTouched(touchedObj);

    const eMap = validate();
    setErrs(eMap);

    if (Object.keys(eMap).length) {
      setMsg('Por favor, corregí los errores en el formulario antes de continuar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);

      const direccionCompleta = `${calle.trim()} ${numero.trim()}`;
      const telefonoLimpio = telefono.replace(/\D/g, '');

      if (!isEdit) {
        const payload = {
          datos_usuario: { username, email, password },
          nombre,
          apellido,
          dni: dni.trim(),
          telefono: telefonoLimpio,
          direccion: direccionCompleta,
          fecha_ingreso: fechaIng || null,
          fecha_egreso: fechaEgr || null,
          rol_asignado: rol,
        };

        await axios.post('/api/gestion-empleados/', payload);

        const goList = await confirm({
          title: 'Empleado creado correctamente',
          message: '',
          okText: 'Volver a la lista',
          cancelText: 'Crear otro',
          tone: 'success',
        });

        const bc = new BroadcastChannel('dashboard');
        bc.postMessage('invalidate');
        bc.close();

        if (goList) {
          navigate('/empleados', {
            replace: true,
            state: { created: true, username },
          });
        } else {
          resetCreate();
        }
      } else {
        const payload = {
          nombre,
          apellido,
          dni: dni.trim(),
          telefono: telefonoLimpio,
          direccion: direccionCompleta,
          fecha_ingreso: fechaIng || null,
          fecha_egreso: fechaEgr || null,
          activo,
          rol_cambio: rol,
        };

        await axios.patch(`/api/gestion-empleados/${id}/`, payload);
        await success({ title: 'Cambios guardados' });

        const bc = new BroadcastChannel('dashboard');
        bc.postMessage('invalidate');
        bc.close();

        navigate('/empleados', { replace: true, state: { updated: true } });
      }
    } catch (errObj) {
      const data = errObj?.response?.data;
      if (data && typeof data === 'object') {
        setErrs(prev => ({ ...prev, ...data }));
      }
      const m = data ? JSON.stringify(data) : errObj.message;
      setMsg('');
      await error({ title: 'Operación fallida', message: m });
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === rol);

  const getFieldStatus = (field, value) => {
    if (!touched[field]) return null;
    const errorMsg = validateField(field, value);
    return errorMsg ? 'error' : 'success';
  };

  // botón deshabilitado según estado
  const isSubmitDisabled =
    loading ||
    (!isEdit && !createHasData) || // Alta: si no hay datos cargados
    (isEdit && !isEditDirty);      // Edición: si no hay cambios

  // =================== si no es admin ===================
  if (!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">Solo los administradores pueden gestionar empleados.</p>
        </div>
      </Layout>
    );
  }

  // =================== estilos inline ===================
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
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 20,
      color: '#374151',
    },
    cardSection: {
      background: '#F9FAFB',
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
      border: '1px solid #E5E7EB',
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
    },
    gridAddress: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 20,
    },
    fieldGroup: {
      marginBottom: 20,
    },
    label: {
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      color: '#6b7280',
      marginBottom: 8,
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      paddingRight: 40,
      fontSize: 14,
      border: '1px solid #d1d5db',
      borderRadius: 8,
      background: '#fff',
      color: '#111827',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.15s ease',
    },
    inputWrapper: {
      position: 'relative',
    },
    inputError: {
      borderColor: '#ef4444',
      background: '#fef2f2',
    },
    inputSuccess: {
      borderColor: '#10b981',
      background: '#f0fdf4',
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    eyeButton: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: 4,
      display: 'flex',
      alignItems: 'center',
    },
    strengthBar: {
      marginTop: 12,
      padding: 12,
      background: '#f9fafb',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
    },
    strengthLabel: {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 6,
    },
    progressBar: {
      width: '100%',
      height: 6,
      background: '#e5e7eb',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      transition: 'all 0.3s ease',
      borderRadius: 3,
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      fontSize: 14,
      borderRadius: 8,
      border: '1px solid #d1d5db',
      background: '#fff',
      color: '#111827',
      outline: 'none',
    },
    checkbox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: 12,
      background: '#F9FAFB',
      borderRadius: 8,
      marginTop: 8,
    },
    buttonRow: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-start',
      marginTop: 8,
    },
    primaryButton: {
      padding: '12px 28px',
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
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.outerCard}>
          {/* Header */}
          <div style={styles.headerRow}>
            <button type="button" onClick={handleBack} style={styles.backLink}>
              <ArrowLeft size={16} />
              Volver a empleados
            </button>
            <h1 style={styles.headerTitle}>
              {isEdit ? 'Editar empleado' : 'Nuevo empleado'}
            </h1>
          </div>

          {msg && (
            <div style={styles.alertError}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Error en el formulario</div>
                <div style={{ fontSize: 14 }}>{msg}</div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Credenciales solo en alta */}
            {!isEdit && (
              <div style={styles.cardSection}>
                <div style={styles.sectionTitle}>Credenciales de acceso</div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Nombre de usuario</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={username}
                      onChange={e => handleChange('username', e.target.value, setUsername)}
                      onBlur={() => handleBlur('username')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('username', username) === 'error' && styles.inputError),
                        ...(getFieldStatus('username', username) === 'success' &&
                          styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.username && touched.username && (
                    <div style={styles.errorText}>{String(errs.username)}</div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => handleChange('email', e.target.value, setEmail)}
                      onBlur={() => handleBlur('email')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('email', email) === 'error' && styles.inputError),
                        ...(getFieldStatus('email', email) === 'success' && styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.email && touched.email && (
                    <div style={styles.errorText}>{String(errs.email)}</div>
                  )}
                </div>

                <div style={styles.grid2}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Contraseña</label>
                    <div style={styles.inputWrapper}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => handleChange('password', e.target.value, setPassword)}
                        onBlur={() => handleBlur('password')}
                        placeholder="Mínimo 8 caracteres"
                        style={{
                          ...styles.input,
                          ...(getFieldStatus('password', password) === 'error' &&
                            styles.inputError),
                          ...(getFieldStatus('password', password) === 'success' &&
                            styles.inputSuccess),
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {password && (
                      <div style={styles.strengthBar}>
                        <div
                          style={{
                            ...styles.strengthLabel,
                            color: passwordStrength.color,
                          }}
                        >
                          Contraseña {passwordStrength.label.toLowerCase()}
                        </div>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${(passwordStrength.level / 4) * 100}%`,
                              background: passwordStrength.color,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {errs.password && touched.password && (
                      <div style={styles.errorText}>{String(errs.password)}</div>
                    )}
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Confirmar contraseña</label>
                    <div style={styles.inputWrapper}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e =>
                          handleChange('confirmPassword', e.target.value, setConfirmPassword)
                        }
                        onBlur={() => handleBlur('confirmPassword')}
                        style={{
                          ...styles.input,
                          ...(getFieldStatus('confirmPassword', confirmPassword) === 'error' &&
                            styles.inputError),
                          ...(getFieldStatus('confirmPassword', confirmPassword) === 'success' &&
                            styles.inputSuccess),
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errs.confirmPassword && touched.confirmPassword && (
                      <div style={styles.errorText}>{String(errs.confirmPassword)}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Datos personales */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Datos personales</div>

              <div style={styles.grid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Nombre</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => handleChange('nombre', e.target.value, setNombre)}
                      onBlur={() => handleBlur('nombre')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('nombre', nombre) === 'error' && styles.inputError),
                        ...(getFieldStatus('nombre', nombre) === 'success' &&
                          styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.nombre && touched.nombre && (
                    <div style={styles.errorText}>{String(errs.nombre)}</div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Apellido</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={apellido}
                      onChange={e => handleChange('apellido', e.target.value, setApellido)}
                      onBlur={() => handleBlur('apellido')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('apellido', apellido) === 'error' &&
                          styles.inputError),
                        ...(getFieldStatus('apellido', apellido) === 'success' &&
                          styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.apellido && touched.apellido && (
                    <div style={styles.errorText}>{String(errs.apellido)}</div>
                  )}
                </div>
              </div>

              <div style={styles.grid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>DNI / CUIT</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={dni}
                      onChange={e => handleChange('dni', e.target.value, setDni)}
                      onBlur={() => handleBlur('dni')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('dni', dni) === 'error' && styles.inputError),
                        ...(getFieldStatus('dni', dni) === 'success' && styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.dni && touched.dni && (
                    <div style={styles.errorText}>
                      {Array.isArray(errs.dni) ? errs.dni[0] : String(errs.dni)}
                    </div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={telefono}
                      onChange={e => handlePhoneChange(e.target.value)}
                      onBlur={() => handleBlur('telefono')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('telefono', telefono) === 'error' &&
                          styles.inputError),
                        ...(getFieldStatus('telefono', telefono) === 'success' &&
                          styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.telefono && touched.telefono && (
                    <div style={styles.errorText}>{String(errs.telefono)}</div>
                  )}
                </div>
              </div>

              <div style={styles.gridAddress}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Calle</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={calle}
                      onChange={e => handleChange('calle', e.target.value, setCalle)}
                      onBlur={() => handleBlur('calle')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('calle', calle) === 'error' && styles.inputError),
                        ...(getFieldStatus('calle', calle) === 'success' && styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.calle && touched.calle && (
                    <div style={styles.errorText}>{String(errs.calle)}</div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Número</label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="text"
                      value={numero}
                      onChange={e => handleChange('numero', e.target.value, setNumero)}
                      onBlur={() => handleBlur('numero')}
                      style={{
                        ...styles.input,
                        ...(getFieldStatus('numero', numero) === 'error' && styles.inputError),
                        ...(getFieldStatus('numero', numero) === 'success' &&
                          styles.inputSuccess),
                      }}
                    />
                  </div>
                  {errs.numero && touched.numero && (
                    <div style={styles.errorText}>{String(errs.numero)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Información laboral */}
            <div style={styles.cardSection}>
              <div style={styles.sectionTitle}>Información laboral</div>

              <div style={styles.grid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Fecha de ingreso</label>
                  <input
                    type="date"
                    value={fechaIng}
                    onChange={e => handleChange('fechaIng', e.target.value, setFechaIng)}
                    onBlur={() => handleBlur('fechaIng')}
                    style={{
                      ...styles.input,
                      ...(getFieldStatus('fechaIng', fechaIng) === 'error' && styles.inputError),
                      ...(getFieldStatus('fechaIng', fechaIng) === 'success' &&
                        styles.inputSuccess),
                      paddingRight: 14,
                    }}
                  />
                  {errs.fecha_ingreso && touched.fechaIng && (
                    <div style={styles.errorText}>{String(errs.fecha_ingreso)}</div>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Fecha de egreso (opcional)</label>
                  <input
                    type="date"
                    value={fechaEgr}
                    onChange={e => handleChange('fechaEgr', e.target.value, setFechaEgr)}
                    onBlur={() => handleBlur('fechaEgr')}
                    style={{
                      ...styles.input,
                      ...(getFieldStatus('fechaEgr', fechaEgr) === 'error' && styles.inputError),
                      ...(getFieldStatus('fechaEgr', fechaEgr) === 'success' &&
                        styles.inputSuccess),
                      paddingRight: 14,
                    }}
                  />
                  {errs.fecha_egreso && touched.fechaEgr && (
                    <div style={styles.errorText}>{String(errs.fecha_egreso)}</div>
                  )}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  {selectedRole?.icon || '👤'} Rol / puesto
                </label>
                <select
                  value={rol}
                  onChange={e => setRol(e.target.value)}
                  style={{ ...styles.select, ...(errs.rol && styles.inputError) }}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.icon} {r.label}
                    </option>
                  ))}
                  {!ROLES.find(r => r.value === 'empleado') && (
                    <option value="empleado">👤 Empleado</option>
                  )}
                </select>
                {errs.rol && <div style={styles.errorText}>{String(errs.rol)}</div>}
              </div>

              {isEdit && (
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={e => setActivo(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Empleado activo</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Desmarcar si el empleado ya no trabaja en la empresa.
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Botones */}
            <div style={styles.buttonRow}>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                style={{
                  ...styles.primaryButton,
                  opacity: isSubmitDisabled ? 0.6 : 1,
                  cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? '⏳ Guardando...'
                  : isEdit
                  ? 'Guardar cambios'
                  : 'Crear empleado'}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleBack}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}








