from rest_framework import serializers
from .models import Pago
from alquileres.models import Alquiler
class PagoSerializer(serializers.ModelSerializer):

    class Meta:
        model = Pago
        fields = "__all__"
        read_only_fields = ("id_pago", "fecha_pago", "cliente", "sentido")

    # -------------------------------
    # TIPOS NUEVOS Y ORIGINALES
    # -------------------------------

    INGRESO_TYPES = {
        "SENIA",
        "SALDO",
        "GARANTIA",
        "DEVOLUCION_TARDIA",
        "OTRO_INGRESO",

        # NUEVOS INGRESOS
        "ALQUILER",
        "OTRO_MOVIMIENTO",
    }

    EGRESO_TYPES = {
        "DEVOLUCION_GARANTIA",
        "APLICACION_GARANTIA",
        "OTRO_EGRESO",

        # NUEVOS EGRESOS
        "COMPRA_INSUMOS",
        "PAGO_TRABAJADORES",
        "SERVICIOS",
        "MANTENIMIENTO",
    }

    # -------------------------------
    # VALIDACIÓN GENERAL
    # -------------------------------

    def validate(self, data):
        instance = self.instance

        pedido = data.get("pedido", getattr(instance, "pedido", None))
        alquiler = data.get("alquiler", getattr(instance, "alquiler", None))

        tipo_pago = data.get("tipo_pago", getattr(instance, "tipo_pago", None))

        # TIPOS QUE NECESITAN ORIGEN (solo los viejos)
        tipos_con_origen = [
            "SENIA", "SALDO", "GARANTIA",
            "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA"
        ]

        if tipo_pago in tipos_con_origen:
            if not pedido and not alquiler:
                raise serializers.ValidationError(
                    "El pago debe estar asociado a un Pedido o un Alquiler."
                )
            if pedido and alquiler:
                raise serializers.ValidationError(
                    "No puedes asociar el pago a Pedido y Alquiler al mismo tiempo."
                )

        # GARANTÍAS → SOLO ALQUILER
        if tipo_pago in ("GARANTIA", "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA") and not alquiler:
            raise serializers.ValidationError(
                f"El tipo de pago '{tipo_pago}' debe estar asociado a un Alquiler."
            )

        # -------------------------------
        # ESTADO GARANTÍA AUTOMÁTICO
        # -------------------------------
        if tipo_pago == "GARANTIA":
            data["estado_garantia"] = "PENDIENTE"
        elif tipo_pago == "DEVOLUCION_GARANTIA":
            data["estado_garantia"] = "DEVUELTA"
        elif tipo_pago == "APLICACION_GARANTIA":
            data["estado_garantia"] = "APLICADA"
        else:
            data["estado_garantia"] = None

        # -------------------------------
        # SENTIDO (INGRESO / EGRESO)
        # -------------------------------
        if tipo_pago in self.INGRESO_TYPES:
            data["sentido"] = "INGRESO"

        elif tipo_pago in self.EGRESO_TYPES:
            data["sentido"] = "EGRESO"

        return data

    # ---------------------------------------------------------------------
    # INFERENCIA AUTOMÁTICA DE CLIENTE (si no viene en el POST)
    # ---------------------------------------------------------------------
    def _infer_cliente(self, pedido, alquiler):

        if pedido:
            if hasattr(pedido, "cliente") and pedido.cliente:
                return pedido.cliente
            if hasattr(pedido, "cliente_fk") and pedido.cliente_fk:
                return pedido.cliente_fk

        if alquiler:
            if hasattr(alquiler, "cliente_fk") and alquiler.cliente_fk:
                return alquiler.cliente_fk
            if hasattr(alquiler, "cliente") and alquiler.cliente:
                return alquiler.cliente

        return None

    # -------------------------------
    # CREATE
    # -------------------------------
    def create(self, validated_data):
        pedido = validated_data.get("pedido")
        alquiler = validated_data.get("alquiler")

        if not validated_data.get("cliente"):
            cliente = self._infer_cliente(pedido, alquiler)
            if cliente:
                validated_data["cliente"] = cliente

        return super().create(validated_data)

    # -------------------------------
    # UPDATE
    # -------------------------------
    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)

        if not instance.cliente:
            cliente = self._infer_cliente(instance.pedido, instance.alquiler)
            if cliente:
                instance.cliente = cliente
                instance.save(update_fields=["cliente"])

        return instance


class AlquilerSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente', read_only=True)

    class Meta:
        model = Alquiler
        fields = '__all__'


