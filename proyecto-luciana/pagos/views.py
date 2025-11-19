from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum

from .models import Pago
from pedidos.models import Pedido
from alquileres.models import Alquiler
from incidentes.models import Incidente
from .serializers import PagoSerializer


class PagoViewSet(ModelViewSet):
    queryset = Pago.objects.all().order_by('-fecha_pago')   # 👈 CAMBIADO
    serializer_class = PagoSerializer

    # -----------------------------
    # CREACIÓN PERSONALIZADA
    # -----------------------------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        tipo_pago = data.get("tipo_pago")

        TIPOS_EGRESO = {
            "DEVOLUCION_GARANTIA",
            "APLICACION_GARANTIA",
            "COMPRA_INSUMOS",
            "COMPRA_MANTENIMIENTO",
            "PAGO_PROVEEDOR",
            "GASTO_GENERAL",
            "OTRO_EGRESO",
        }

        TIPOS_INGRESO = {
            "SENIA",
            "SALDO",
            "GARANTIA",
            "DEVOLUCION_TARDIA",
            "OTRO_INGRESO",
        }

        # SENTIDO
        if tipo_pago in TIPOS_INGRESO:
            data["sentido"] = "INGRESO"
        elif tipo_pago in TIPOS_EGRESO:
            data["sentido"] = "EGRESO"
        else:
            return Response({"error": "Tipo de pago inválido."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Ajuste de monto
        try:
            monto = float(data.get("monto", 0))
        except:
            return Response({"error": "Monto inválido"}, status=status.HTTP_400_BAD_REQUEST)

        if data["sentido"] == "EGRESO":
            data["monto"] = -abs(monto)

        if data["sentido"] == "INGRESO":
            data["monto"] = abs(monto)

        # Validación especial
        if tipo_pago == "APLICACION_GARANTIA" and not data.get("incidente"):
            return Response({"error": "Debe especificar un incidente."},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # -----------------------------
    # PAGOS POR PEDIDO
    # -----------------------------
    @action(detail=False, methods=["GET"])
    def por_pedido(self, request):
        pedido_id = request.query_params.get("pedido_id")

        if not pedido_id:
            return Response({"error": "Debe enviar pedido_id."},
                            status=status.HTTP_400_BAD_REQUEST)

        pagos = Pago.objects.filter(pedido_id=pedido_id).order_by("-fecha_pago")
        serializer = self.get_serializer(pagos, many=True)
        return Response(serializer.data)

    # -----------------------------
    # PAGOS POR ALQUILER
    # -----------------------------
    @action(detail=False, methods=["GET"])
    def por_alquiler(self, request):
        alquiler_id = request.query_params.get("alquiler_id")

        if not alquiler_id:
            return Response({"error": "Debe enviar alquiler_id."},
                            status=status.HTTP_400_BAD_REQUEST)

        pagos = Pago.objects.filter(alquiler_id=alquiler_id).order_by("-fecha_pago")
        serializer = self.get_serializer(pagos, many=True)
        return Response(serializer.data)

    # -----------------------------
    # PAGOS POR INCIDENTE
    # -----------------------------
    @action(detail=False, methods=["GET"])
    def por_incidente(self, request):
        incidente_id = request.query_params.get("incidente_id")

        if not incidente_id:
            return Response({"error": "Debe enviar incidente_id."},
                            status=status.HTTP_400_BAD_REQUEST)

        pagos = Pago.objects.filter(incidente_id=incidente_id).order_by("-fecha_pago")
        serializer = self.get_serializer(pagos, many=True)
        return Response(serializer.data)

    # -----------------------------
    # RESUMEN
    # -----------------------------
    @action(detail=False, methods=["GET"])
    def resumen(self, request):
        ingresos = Pago.objects.filter(sentido="INGRESO").aggregate(total=Sum("monto"))["total"] or 0
        egresos = Pago.objects.filter(sentido="EGRESO").aggregate(total=Sum("monto"))["total"] or 0

        return Response({
            "ingresos": ingresos,
            "egresos": abs(egresos),
            "balance": ingresos + egresos
        })



