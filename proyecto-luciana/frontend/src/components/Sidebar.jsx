import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import {
  Home,
  Users,
  Boxes,
  Truck,
  FileText,
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
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    ['access_token', 'refresh_token'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    navigate('/login', { replace: true });
  };

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
        <Item to="/dashboard"  icon={Home}          label="Panel de control" />
        <Item to="/clientes"   icon={Contact}       label="Clientes" />
        <Item to="/productos"  icon={Boxes}         label="Productos" />
        <Item to="/pedidos"    icon={ClipboardList} label="Pedidos" />
        <Item to="/entregas"   icon={Package}       label="Entregas" />
        <Item to="/alquileres" icon={Truck}         label="Alquileres" />
        <Item to="/pagos"      icon={CreditCard}    label="Pagos" />
        <Item to="/caja"       icon={Wallet}        label="Caja" />
        <Item to="/incidentes" icon={AlertTriangle} label="Incidentes" />
        {isAdmin && <Item to="/empleados" icon={Users} label="Empleados" />}
      </nav>

      <div className="sb-bottom">
        {isAdmin ? (
          <span className="chip chip-admin">
            <ShieldCheck size={14} />&nbsp;Administrador
          </span>
        ) : (
          <span className="chip">
            <UserIcon size={14} />&nbsp;Empleado
          </span>
        )}
        <button className="sb-logout" onClick={handleLogout}>
          <LogOut size={16} />&nbsp;Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
