# myproject/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# --- Auth / Perfil ---
from accounts.auth import EmailOrUsernameTokenObtainPairView
from accounts.views import PerfilUsuarioAPIView

# --- ViewSets ---
from empleados.views import EmpleadoViewSet
from productos.views import ProductoViewSet
from incidentes.views import IncidenteViewSet
from clientes.views import ClienteViewSet
from alquileres.views import AlquilerViewSet, DetAlquilerViewSet, AlquilerEntregarView
from pedidos.views import PedidoCreateView, PedidoCancelarView, PedidoViewSet
from pagos.views import PagoViewSet
from caja.views import CajaViewSet



# ===================================================================
#   ROUTER PRINCIPAL
# ===================================================================
router = DefaultRouter()
router.register(r'gestion-empleados', EmpleadoViewSet, basename='empleado')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'incidentes', IncidenteViewSet, basename='incidente')
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'alquileres', AlquilerViewSet, basename='alquiler')
router.register(r'det-alquileres', DetAlquilerViewSet, basename='detalquiler')
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'pagos', PagoViewSet, basename='pago')
router.register(r'cajas', CajaViewSet, basename='caja')



# ===================================================================
#   URLS PRINCIPALES
# ===================================================================
urlpatterns = [

    # Admin
    path('admin/', admin.site.urls),

    # Autenticación JWT
    path('api/token/', EmailOrUsernameTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Perfil
    path('api/perfil/', PerfilUsuarioAPIView.as_view(), name='perfil_usuario'),

    # ===================================================================
    #   RUTAS CUSTOM (DEBEN IR ANTES DEL ROUTER)
    # ===================================================================

    # Pedidos personalizados
    path('api/pedidos/crear/', PedidoCreateView.as_view(), name='pedido-crear'),
    path('api/pedidos/<int:pk>/cancelar/', PedidoCancelarView.as_view(), name='pedido-cancelar'),

    # Alquileres personalizados
    path('api/alquileres/<int:pk>/entregar/', AlquilerEntregarView.as_view(), name='alquiler-entregar'),

    # ===================================================================
    #   API REST GENERAL (MODELVIEWSETS)
    # ===================================================================
    path('api/', include(router.urls)),

    # Entregas
    path('api/', include('entregas.urls')),

    # Dashboard
    path('api/', include('dashboard.urls')),
]


# ===================================================================
#  SERVIR MEDIA EN MODO DEBUG
# ===================================================================
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)