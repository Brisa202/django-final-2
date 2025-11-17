from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    EntregaViewSet,
    DetEntregaViewSet,
    EntregaConfirmarView,
    EntregaEnCaminoView,
)

router = DefaultRouter()
router.register(r'entregas', EntregaViewSet, basename='entrega')
router.register(r'det-entregas', DetEntregaViewSet, basename='det-entrega')

urlpatterns = [
    *router.urls,

    # POST /api/entregas/<id>/en-camino/
    path(
        'entregas/<int:pk>/en-camino/',
        EntregaEnCaminoView.as_view(),
        name='entrega-en-camino'
    ),

    # POST /api/entregas/<id>/confirmar/
    path(
        'entregas/<int:pk>/confirmar/',
        EntregaConfirmarView.as_view(),
        name='entrega-confirmar'
    ),
]
