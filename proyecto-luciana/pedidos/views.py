import json
from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.permissions import IsAuthenticated

from .serializers import (
    PedidoCreateSerializer,
    PedidoOutSerializer,
    PedidoDetailSerializer,
    PedidoUpdateSerializer,
)
from pedidos.services import crear_pedido_y_alquiler, cancelar_pedido
from alquileres.serializers import AlquilerSerializer
from .models import Pedido


# =========================================================
# CREAR PEDIDO
# =========================================================
class PedidoCreateView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Verificar caja abierta
        from caja.models import Caja
        caja_abierta = Caja.objects.filter(estado='ABIERTA').first()
        if not caja_abierta:
            return Response(
                {
                    "error": "No se pueden crear pedidos sin una caja abierta",
                    "detail": "Por favor, abre una caja antes de crear pedidos. Ve a Gestión de Caja."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()

        # convertir items JSON string
        if isinstance(data.get("items"), str):
            try:
                data["items"] = json.loads(data["items"])
            except Exception:
                return Response(
                    {"detail": "Formato inválido de 'items'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        s = PedidoCreateSerializer(data=data)
        s.is_valid(raise_exception=True)

        # Crear pedido + alquiler
        ped, alq = crear_pedido_y_alquiler(
            cliente_id=s.validated_data["cliente_id"],
            items=s.validated_data["items"],
            fecha_hora_evento=s.validated_data["fecha_hora_evento"],
            fecha_hora_devolucion=s.validated_data["fecha_hora_devolucion"],
            senia=s.validated_data.get("senia"),
            forma_pago=s.validated_data.get("forma_pago"),
            comprobante_url=s.validated_data.get("comprobante_url"),
            comprobante_file=request.FILES.get("comprobante_file"),
        )

        # Completar garantía
        for field in [
            "garantia_monto",
            "garantia_tipo",
            "garantia_estado",
            "garantia_dni_url",
            "garantia_serv_url",
            "garantia_otro_url",
        ]:
            val = s.validated_data.get(field, None)
            if val not in (None, ""):
                setattr(ped, field, val)

        # Archivos garantía
        files = {
            "garantia_dni_file": request.FILES.get("garantia_dni_file"),
            "garantia_serv_file": request.FILES.get("garantia_serv_file"),
            "garantia_otro_file": request.FILES.get("garantia_otro_file"),
        }
        for model_field, f in files.items():
            if f:
                setattr(ped, model_field, f)

        # ====================
        # ENTREGA Y FLETE MANUAL
        # ====================
        ped.tipo_entrega = s.validated_data.get("tipo_entrega", "retiro")
        ped.direccion_evento = s.validated_data.get("direccion_evento", "")
        ped.referencia_entrega = s.validated_data.get("referencia_entrega", "")

        # 🆕 COSTO FLETE MANUAL (NUMÉRICO)
        ped.costo_flete = s.validated_data.get("costo_flete", 0)

        ped.save()

        # Registrar seña automática
        from pagos.models import Pago

        senia = s.validated_data.get("senia")
        forma_pago = (s.validated_data.get("forma_pago") or "").upper()
        comprobante_url = s.validated_data.get("comprobante_url") or ""

        if "TRANS" in forma_pago:
            metodo_pago = "TRANSFERENCIA"
        else:
            metodo_pago = "EFECTIVO"

        try:
            monto_senia = Decimal(str(senia)) if senia is not None else Decimal("0")
        except Exception:
            monto_senia = Decimal("0")

        if monto_senia > 0:
            Pago.objects.create(
                pedido=ped,
                cliente=getattr(ped, "cliente", None),
                caja=caja_abierta,
                tipo_pago="SENIA",
                sentido="INGRESO",
                monto=monto_senia,
                metodo_pago=metodo_pago,
                comprobante_pago=comprobante_url,
                notas="Seña registrada automáticamente al crear el pedido",
            )

        return Response(
            {
                "pedido": PedidoDetailSerializer(
                    ped, context={"request": request}
                ).data,
                "alquiler": AlquilerSerializer(
                    alq, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# CANCELAR PEDIDO
# =========================================================
class PedidoCancelarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        ped = cancelar_pedido(pk)
        return Response(
            PedidoDetailSerializer(ped, context={"request": request}).data
        )


# =========================================================
# CRUD COMPLETO DE PEDIDOS
# =========================================================
class PedidoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    queryset = (
        Pedido.objects
        .select_related("cliente")
        .prefetch_related("detalles__producto")
        .order_by("-id")
    )

    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ["id", "fecha_hora_evento", "fecha_hora_devolucion", "creado_en"]
    search_fields = ["cliente__nombre", "cliente__apellido", "estado"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PedidoDetailSerializer
        elif self.action in ("update", "partial_update"):
            return PedidoUpdateSerializer
        return PedidoOutSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def update(self, request, *args, **kwargs):
        return self._actualizar_y_devolver_detalle(
            request, partial=False, *args, **kwargs
        )

    def partial_update(self, request, *args, **kwargs):
        return self._actualizar_y_devolver_detalle(
            request, partial=True, *args, **kwargs
        )

    def _actualizar_y_devolver_detalle(self, request, partial, *args, **kwargs):
        instance = self.get_object()
        serializer = PedidoUpdateSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        detalle = PedidoDetailSerializer(
            instance, context={"request": request}
        ).data
        return Response(detalle, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        pedido = self.get_object()

        if not pedido.can_delete():
            return Response(
                {
                    "detail": "Este pedido no puede eliminarse. Solo los pedidos cancelados o entregados pueden borrarse."
                },
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )

        pedido_id = pedido.id
        pedido.delete()
        return Response(
            {"detail": f"Pedido #{pedido_id} eliminado correctamente."},
            status=status.HTTP_204_NO_CONTENT,
        )
