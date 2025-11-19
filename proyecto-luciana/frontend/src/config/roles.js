// src/config/roles.js

/**
 * Define qué módulos puede ver cada rol.
 * Los nombres de los módulos deben coincidir con los IDs en el Sidebar.
 */
export const PERMISOS_POR_ROL = {
  // Administrador: acceso total a todo el sistema
  administrador: [
    'dashboard',
    'clientes',
    'productos',
    'pedidos',
    'entregas',
    'alquileres',
    'pagos',
    'caja',
    'incidentes',
    'empleados'
  ],
  
  // Chofer: solo entregas y alquileres (gestión de transporte)
  chofer: [
    'entregas',
    'alquileres'
  ],
  
  // Cajero: manejo de dinero y transacciones
  cajero: [
    'pagos',
    'caja',
    'clientes'  // Para consultar datos de clientes al cobrar
  ],
  
  // Operario de carga: entregas e incidentes
  operario_carga: [
    'entregas',
    'incidentes',
    'alquileres'
  ],
  
  // Encargado: casi todo excepto gestión de empleados
  encargado: [
    'dashboard',
    'clientes',
    'productos',
    'pedidos',
    'entregas',
    'alquileres',
    'pagos',
    'caja',
    'incidentes'
  ],
  
  // Empleado genérico: operaciones básicas del día a día
  empleado: [
    'dashboard',
    'clientes',
    'productos',
    'pedidos',
    'entregas'
  ]
};

/**
 * Verifica si un usuario con cierto rol tiene permiso para acceder a un módulo.
 * @param {string} rol - El rol del usuario ('administrador', 'chofer', etc.)
 * @param {string} modulo - El ID del módulo ('dashboard', 'clientes', etc.)
 * @returns {boolean} - true si tiene permiso, false si no
 */
export const tienePermiso = (rol, modulo) => {
  if (!rol) return false;
  const permisos = PERMISOS_POR_ROL[rol] || [];
  return permisos.includes(modulo);
};

/**
 * Obtiene todos los módulos permitidos para un rol específico.
 * @param {string} rol - El rol del usuario
 * @returns {string[]} - Array con los IDs de módulos permitidos
 */
export const obtenerPermisos = (rol) => {
  return PERMISOS_POR_ROL[rol] || [];
};

/**
 * Obtiene el nombre legible de un rol.
 * @param {string} rol - El rol del usuario
 * @returns {string} - Nombre amigable del rol
 */
export const obtenerNombreRol = (rol) => {
  const nombresRoles = {
    administrador: 'Administrador',
    empleado: 'Empleado',
    chofer: 'Chofer',
    operario_carga: 'Operario de Carga',
    encargado: 'Encargado',
    cajero: 'Cajero'
  };
  return nombresRoles[rol] || 'Usuario';
};