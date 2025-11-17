from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Sum
from django.db.models.functions import TruncDate

from .models import Pago
from pedidos.models import Pedido
from alquileres.models import Alquiler
from incidentes.models import Incidente
from .serializers import PagoSerializer, AlquilerSerializer


class PagoViewSet(ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer

    # 🟩 NUEVO: Endpoint para dashboard (flujo de pagos)
    @action(detail=False, methods=['get'], url_path='flow')
    def flow(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Validación
        if not start_date or not end_date:
            return Response(
                {"detail": "start_date y end_date son requeridos"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Consulta agrupada por día
        pagos = (
            Pago.objects.filter(fecha_pago__date__range=[start_date, end_date])
            .annotate(day=TruncDate('fecha_pago'))
            .values('day')
            .annotate(total=Sum('monto'))
            .order_by('day')
        )

        # Respuesta para el dashboard
        return Response({
            "start_date": start_date,
            "end_date": end_date,
            "chart_data": [
                {"date": p["day"], "total": p["total"]} for p in pagos
            ]
        })

    # 🟨 Devolución de garantía
    @action(detail=True, methods=['post'], url_path='devolucion_garantia')
    def devolucion_garantia(self, request, pk=None):
        alq = self.get_object()

        if not alq.pedido_id:
            return Response(
                {'detail': 'Este alquiler no está vinculado a un pedido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        incidentes = Incidente.objects.filter(
            det_alquiler__alquiler=alq,
            estado_incidente='resuelto',
            resultado_final='repuesto',
        )

        total_incidentes = 0.0
        for incidente in incidentes:
            qty = float(incidente.cantidad_repuesta or incidente.cantidad_afectada or 0)
            precio_unitario = float(incidente.det_alquiler.precio_unit or 0)
            total_incidentes += qty * precio_unitario

        garantia_monto = alq.garantia_monto or 0
        monto_a_devolver = garantia_monto - total_incidentes

        Pago.objects.create(
            monto=monto_a_devolver,
            tipo_pago="DEVOLUCION_GARANTIA",
            metodo_pago="EFECTIVO",
            estado_garantia="DEVUELTA",
            alquiler=alq,
            notas="Devolución de garantía con descuento por incidentes",
        )

        alq.garantia_estado = "DEVUELTA"
        alq.save()

        return Response(
            {'detail': f'Garantía devuelta: ${monto_a_devolver}'},
            status=status.HTTP_200_OK
        )


class AlquilerViewSet(ModelViewSet):
    queryset = Alquiler.objects.all()
    serializer_class = AlquilerSerializer

    def get_queryset(self):
        return Alquiler.objects.all().order_by('-id')

