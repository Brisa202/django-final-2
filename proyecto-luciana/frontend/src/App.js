import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import Employees from "./pages/Employees";
import EmployeeCreate from "./pages/EmployeeCreate";

import Products from "./pages/Products";
import ProductCreate from "./pages/ProductCreate";

import Incidents from "./pages/Incidents";
import IncidentCreate from "./pages/IncidentCreate";

import Rentals from "./pages/Rentals";
import RentalEdit from "./pages/RentalEdit";

import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";

// 🟡 Pedidos
import Orders from "./pages/Orders";
import OrderCreateStep1 from "./pages/OrderCreateStep1";
import OrderCreateStep2 from "./pages/OrderCreateStep2";
import OrderDetail from "./pages/OrderDetail";
import OrderEdit from "./pages/OrderEdit";
import OrderDelivery from "./pages/OrderDelivery";

// 🟢 Entregas
import Deliveries from "./pages/Entregas";
import DeliveryForm from "./pages/EntregaForm";

// 💸 Pagos / Caja
import Pagos from "./pages/Pagos";
import SeleccionTipoPago from "./pages/SeleccionTipoPago";
import PagoForm from "./pages/PagoForm";
import PagoExtraordinarioForm from "./pages/PagoExtraordinarioForm";
import CajaDashboard from "./pages/CajaDashboard";

// 📄 FACTURA PDF (NUEVO)
import FacturaPDF from "./pages/FacturaPDF";

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Empleados */}
      <Route
        path="/empleados"
        element={
          <ProtectedRoute>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empleados/nuevo"
        element={
          <ProtectedRoute>
            <EmployeeCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empleados/:id/editar"
        element={
          <ProtectedRoute>
            <EmployeeCreate />
          </ProtectedRoute>
        }
      />

      {/* Productos */}
      <Route
        path="/productos"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/productos/nuevo"
        element={
          <ProtectedRoute>
            <ProductCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/productos/:id/editar"
        element={
          <ProtectedRoute>
            <ProductCreate />
          </ProtectedRoute>
        }
      />

      {/* Incidentes */}
      <Route
        path="/incidentes"
        element={
          <ProtectedRoute>
            <Incidents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidentes/nuevo"
        element={
          <ProtectedRoute>
            <IncidentCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidentes/:id/editar"
        element={
          <ProtectedRoute>
            <IncidentCreate />
          </ProtectedRoute>
        }
      />

      {/* Alquileres */}
      <Route
        path="/alquileres"
        element={
          <ProtectedRoute>
            <Rentals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alquileres/:id/editar"
        element={
          <ProtectedRoute>
            <RentalEdit />
          </ProtectedRoute>
        }
      />

      {/* Clientes */}
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/nuevo"
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/:id/editar"
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />

      {/* Pedidos */}
      <Route
        path="/pedidos"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos/nuevo"
        element={
          <ProtectedRoute>
            <OrderCreateStep1 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos/nuevo/pagos"
        element={
          <ProtectedRoute>
            <OrderCreateStep2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos/:id/editar"
        element={
          <ProtectedRoute>
            <OrderEdit />
          </ProtectedRoute>
        }
      />
      {/* ✅ NUEVO: completar datos de entrega del pedido */}
      <Route
        path="/pedidos/:id/entrega"
        element={
          <ProtectedRoute>
            <OrderDelivery />
          </ProtectedRoute>
        }
      />

      {/* Entregas */}
      <Route
        path="/entregas"
        element={
          <ProtectedRoute>
            <Deliveries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entregas/nueva"
        element={
          <ProtectedRoute>
            <DeliveryForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entregas/:id/editar"
        element={
          <ProtectedRoute>
            <DeliveryForm />
          </ProtectedRoute>
        }
      />

      {/* Pagos */}
      <Route
        path="/pagos"
        element={
          <ProtectedRoute>
            <Pagos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagos/nuevo"
        element={
          <ProtectedRoute>
            <SeleccionTipoPago />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagos/alquiler"
        element={
          <ProtectedRoute>
            <PagoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagos/extraordinario"
        element={
          <ProtectedRoute>
            <PagoExtraordinarioForm />
          </ProtectedRoute>
        }
      />

      {/* Caja */}
      <Route
        path="/caja"
        element={
          <ProtectedRoute>
            <CajaDashboard />
          </ProtectedRoute>
        }
      />

      {/* 🟡 NUEVO: FACTURA PDF */}
      <Route
        path="/factura/pdf"
        element={
          <ProtectedRoute>
            <FacturaPDF />
          </ProtectedRoute>
        }
      />

      {/* Redirección comodín */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
