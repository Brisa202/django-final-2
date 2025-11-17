from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import Entrega, DetEntrega
from .serializers import (
    EntregaSerializer,
    EntregaDetailSerializer,
    DetEntregaSerializer,
)


class EntregaViewSet(viewsets.ModelViewSet):
    queryset = Entrega.objects.select_related('alquiler', 'responsable_principal')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['direccion', 'alquiler__cliente', 'alquiler__cliente_fk__nombre']
    ordering_fields = ['fecha_hora_entrega', 'creado_en']
    ordering = ['-fecha_hora_entrega']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EntregaDetailSerializer
        return EntregaSerializer

    def get_permissions(self):
        # listar / ver detalle: cualquier autenticado
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        # crear / editar / borrar: solo admin
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        estado = self.request.query_params.get('estado')
        alquiler_id = self.request.query_params.get('alquiler')
        if estado:
            qs = qs.filter(estado_entrega=estado)
        if alquiler_id:
            qs = qs.filter(alquiler_id=alquiler_id)
        return qs


class DetEntregaViewSet(viewsets.ModelViewSet):
    queryset = DetEntrega.objects.select_related('entrega', 'empleado')
    serializer_class = DetEntregaSerializer
    permission_classes = [IsAdminUser]


def _puede_operar_entrega(user, entrega: Entrega):
    """
    Devuelve True si user es admin o es el empleado responsable_principal.
    """
    if user.is_staff or user.is_superuser:
        return True
    empleado = getattr(user, 'empleado', None)
    return bool(
        empleado and entrega.responsable_principal_id == empleado.id_empleados
    )


class EntregaEnCaminoView(APIView):
    """
    POST /api/entregas/<id>/en-camino/
    Cambia estado a 'en_camino'.
    Solo admin o chofer responsable.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            entrega = Entrega.objects.get(pk=pk)
        except Entrega.DoesNotExist:
            return Response(
                {"detail": "Entrega no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not _puede_operar_entrega(request.user, entrega):
            return Response(
                {"detail": "No tenés permisos para actualizar esta entrega."},
                status=status.HTTP_403_FORBIDDEN,
            )

        entrega.estado_entrega = 'en_camino'
        entrega.save(update_fields=['estado_entrega'])

        return Response(
            {
                "detail": "Entrega marcada como 'en camino'.",
                "estado_entrega": entrega.estado_entrega,
            },
            status=status.HTTP_200_OK,
        )


class EntregaConfirmarView(APIView):
    """
    POST /api/entregas/<id>/confirmar/
    Marca estado_entrega='entregado' y setea fecha_hora_entrega_real=ahora.
    Solo admin o chofer responsable.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            entrega = Entrega.objects.get(pk=pk)
        except Entrega.DoesNotExist:
            return Response(
                {"detail": "Entrega no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not _puede_operar_entrega(request.user, entrega):
            return Response(
                {"detail": "No tenés permisos para confirmar esta entrega."},
                status=status.HTTP_403_FORBIDDEN,
            )

        entrega.estado_entrega = 'entregado'
        entrega.fecha_hora_entrega_real = timezone.now()
        entrega.save(update_fields=['estado_entrega', 'fecha_hora_entrega_real'])

        return Response(
            {
                "detail": "Entrega marcada como entregada.",
                "estado_entrega": entrega.estado_entrega,
                "fecha_hora_entrega_real": entrega.fecha_hora_entrega_real,
            },
            status=status.HTTP_200_OK,
        )
