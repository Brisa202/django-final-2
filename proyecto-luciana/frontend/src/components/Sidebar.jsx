import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tienePermiso, obtenerNombreRol } from '../config/roles';
import logo from '../assets/logo.png';
import {
  Home,
  Users,
  Boxes,
  Truck,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  AlertTriangle,
  Contact,
  ClipboardList,
  Package,
  CreditCard,
  Wallet
} from 'lucide-react';

export default function Sidebar() {
  const { profile, isAdmin, logout } = useAuth();

  // Obtener el rol del usuario actual
  const rolUsuario = profile?.rol || 'empleado';

  // Definir TODAS las opciones del menú con sus IDs únicos
  const menuItems = [
    { id: 'dashboard', to: '/dashboard', icon: Home, label: 'Panel de control' },
    { id: 'clientes', to: '/clientes', icon: Contact, label: 'Clientes' },
    { id: 'productos', to: '/productos', icon: Boxes, label: 'Productos' },
    { id: 'pedidos', to: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
    { id: 'entregas', to: '/entregas', icon: Package, label: 'Entregas' },
    { id: 'alquileres', to: '/alquileres', icon: Truck, label: 'Alquileres' },
    { id: 'pagos', to: '/pagos', icon: CreditCard, label: 'Pagos' },
    { id: 'caja', to: '/caja', icon: Wallet, label: 'Caja' },
    { id: 'incidentes', to: '/incidentes', icon: AlertTriangle, label: 'Incidentes' },
    { id: 'empleados', to: '/empleados', icon: Users, label: 'Empleados' }
  ];

  // 🔥 FILTRAR el menú según los permisos del rol
  const menuFiltrado = menuItems.filter(item => 
    tienePermiso(rolUsuario, item.id)
  );

  const Item = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
    >
      <span className="sb-ic">
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src={logo} alt="" />
        <div>
          <b>Hollywood</b>
          <small>Producciones</small>
        </div>
      </div>

      <nav className="sb-nav">
        {/* 🔥 Renderizar solo los items permitidos */}
        {menuFiltrado.map(item => (
          <Item 
            key={item.id}
            to={item.to} 
            icon={item.icon} 
            label={item.label} 
          />
        ))}
      </nav>

      <div className="sb-bottom">
        {isAdmin ? (
          <span className="chip chip-admin">
            <ShieldCheck size={14} />&nbsp;Administrador
          </span>
        ) : (
          <span className="chip">
            <UserIcon size={14} />&nbsp;{obtenerNombreRol(rolUsuario)}
          </span>
        )}
        <button className="sb-logout" onClick={logout}>
          <LogOut size={16} />&nbsp;Cerrar sesión
        </button>
      </div>
    </aside>
  );
}