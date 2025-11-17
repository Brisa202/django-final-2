// src/utils/validators.js 

export const isRequired = (v) =>
  v !== null && v !== undefined && String(v).trim() !== '';

export const minLen = (v, n) => String(v || '').trim().length >= n;
export const maxLen = (v, n) => String(v || '').trim().length <= n;

export const isEmail = (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));

export const isURL = (v) =>
  !v || /^(https?:\/\/)[^\s]+$/i.test(v);

export const isPosInt = (v) =>
  Number.isInteger(Number(v)) && Number(v) > 0;

// Alias para código viejo
export const isPositiveInt = (v) => isPosInt(v);

export const isNonNegNumber = (v, allowEmpty = false) => {
  if (allowEmpty && (v === '' || v === null || v === undefined)) return true;
  return !isNaN(v) && Number(v) >= 0;
};

export const inSet = (v, arr) => arr.includes(v);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const notFuture = (d) => !d || d <= todayISO();

export const lte = (a, b) => Number(a) <= Number(b);

export const firstError = (errors) => {
  const k = Object.keys(errors).find((k) => errors[k]);
  return k ? errors[k] : '';
};

/* ====== DNI/CUIT (Argentina) y teléfono ====== */

export const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');

export const isDNI = (v) => {
  const d = onlyDigits(v);
  return d.length >= 7 && d.length <= 8;
};

export const isCUIT = (v) => {
  const d = onlyDigits(v);
  if (d.length !== 11) return false;
  const mult = [5,4,3,2,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(d[i], 10) * mult[i];
  }
  let mod = 11 - (sum % 11);
  if (mod === 11) mod = 0;
  if (mod === 10) mod = 9;
  return mod === parseInt(d[10], 10);
};

export const isDniOrCuit = (v, required = false) => {
  const s = String(v || '').trim();
  if (!s) return !required; // si no es requerido, vacío = OK
  return isDNI(s) || isCUIT(s);
};

// Teléfono genérico (lo usabas antes)
export const isPhone = (v) =>
  !v || /^[0-9+()\s-]{6,20}$/.test(String(v));

/**
 * Teléfono Argentina a nivel nacional.
 * Acepta:
 * - +54 9 + 10 dígitos (celulares)
 * - +54 + 10 dígitos
 * - 10 u 11 dígitos nacionales sin +54
 */
export const isArPhone = (v) => {
  if (!v) return false;

  const digits = onlyDigits(v);

  // Largo imposible
  if (digits.length < 10 || digits.length > 13) return false;

  // Con código país
  if (digits.startsWith('54')) {
    const rest = digits.slice(2); // sin 54

    // +54 + 10 dígitos
    if (rest.length === 10) return true;

    // +54 9 + 10 dígitos (celular)
    if (rest.length === 11 && rest.startsWith('9')) return true;

    return false;
  }

  // Sin 54: aceptamos 10 (fijo/cel) u 11 (casos con 0 o características largas)
  if (digits.length === 10 || digits.length === 11) return true;

  return false;
};

/* ====== NOMBRE/APELLIDO (con tildes y ñ) ====== */
/**
 * Valida nombre o apellido argentino:
 * - Solo letras (a-z, A-Z)
 * - Tildes (á, é, í, ó, ú, ü)
 * - Letra ñ/Ñ
 * - Espacios y guiones
 * - Longitud: 2 a 50 caracteres
 */
export const isName = (v) => {
  if (!v) return false;
  const trimmed = String(v).trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  const regex = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-]+$/;
  return regex.test(trimmed);
};

/* ====== USERNAME ====== */
/**
 * Valida nombre de usuario:
 * - Alfanumérico (letras y números)
 * - Guiones bajos permitidos
 * - Sin espacios
 * - Longitud: 4 a 15 caracteres
 */
export const isUsername = (v) => {
  if (!v) return false;
  const trimmed = String(v).trim();
  if (trimmed.length < 4 || trimmed.length > 15) return false;
  const regex = /^[a-zA-Z0-9_]+$/;
  return regex.test(trimmed);
};

/* ====== DIRECCIÓN ====== */
/**
 * Valida dirección:
 * - Alfanumérico con espacios, comas, puntos, guiones
 * - Longitud: 5 a 100 caracteres
 */
export const isAddress = (v) => {
  if (!v) return false;
  const trimmed = String(v).trim();
  if (trimmed.length < 5 || trimmed.length > 100) return false;
  // Permite letras, números, espacios y algunos símbolos comunes en direcciones
  const regex = /^[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s,.\-°º/#]+$/;
  return regex.test(trimmed);
};

/* ====== CONTRASEÑA FUERTE ====== */
/**
 * Valida contraseña fuerte según estándares argentinos:
 * - Mínimo 10 caracteres
 * - Al menos 3 de estos 4:
 *   1. Una mayúscula (A-Z)
 *   2. Una minúscula (a-z)
 *   3. Un número (0-9)
 *   4. Un símbolo (!@#$%^&*...)
 */
export const isStrongPassword = (v) => {
  if (!v || String(v).length < 10) return false;
  
  const hasUpperCase = /[A-Z]/.test(v);
  const hasLowerCase = /[a-z]/.test(v);
  const hasNumber = /[0-9]/.test(v);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v);
  
  // Requiere al menos 3 de las 4 categorías
  const categories = [hasUpperCase, hasLowerCase, hasNumber, hasSymbol].filter(Boolean).length;
  return categories >= 3;
};

/**
 * Calcula la fuerza de una contraseña y devuelve:
 * - level: 0-4 (número)
 * - label: 'Débil', 'Media', 'Fuerte', 'Muy Fuerte'
 * - color: código de color para UI
 * - checks: objeto con cada requisito cumplido
 */
export const getPasswordStrength = (v) => {
  if (!v) return { 
    level: 0, 
    label: '', 
    color: '#666',
    checks: {
      hasLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSymbol: false
    }
  };
  
  const len = String(v).length;
  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasNumber = /[0-9]/.test(v);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v);
  const hasLength = len >= 10;
  
  let score = 0;
  if (len >= 8) score++;
  if (len >= 10) score++;
  if (len >= 12) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;
  
  let result = { level: 1, label: 'Débil', color: '#E53935' };
  if (score <= 2) result = { level: 1, label: 'Débil', color: '#E53935' };
  else if (score <= 4) result = { level: 2, label: 'Media', color: '#FB8C00' };
  else if (score <= 6) result = { level: 3, label: 'Fuerte', color: '#43A047' };
  else result = { level: 4, label: 'Muy Fuerte', color: '#2E7D32' };
  
  return {
    ...result,
    checks: {
      hasLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol
    }
  };
};

/**
 * Verifica que la contraseña NO contenga datos personales
 */
export const passwordNotContainsPersonalData = (password, personalData = {}) => {
  if (!password) return false;
  
  const pwd = String(password).toLowerCase();
  const { nombre, apellido, usuario, dni } = personalData;
  
  // Verifica cada campo personal
  if (nombre && pwd.includes(String(nombre).toLowerCase())) return false;
  if (apellido && pwd.includes(String(apellido).toLowerCase())) return false;
  if (usuario && pwd.includes(String(usuario).toLowerCase())) return false;
  if (dni && pwd.includes(String(dni))) return false;
  
  return true;
};

/* ====== helpers de items ====== */

export const hasMinItems = (arr, n) =>
  Array.isArray(arr) && arr.filter(Boolean).length >= n;