from rest_framework import serializers
from .models import Pago
from alquileres.models import Alquiler


class PagoSerializer(serializers.ModelSerializer):
    # ← Tipos de pago para alquileres
    tipo_pago = serializers.ChoiceField(
        choices=[
            # INGRESOS
            ("SENIA", "Seña / Anticipo"),
            ("SALDO", "Saldo"),
            ("GARANTIA", "Garantía cobrada"),
            ("DEVOLUCION_TARDIA", "Cobro por devolución tardía"),
            ("OTRO_INGRESO", "Otro ingreso"),
            
            # EGRESOS
            ("DEVOLUCION_GARANTIA", "Devolución garantía"),
            ("APLICACION_GARANTIA", "Garantía aplicada a daños"),
            ("OTRO_EGRESO", "Otro egreso"),
        ]
    )
    
    class Meta:
        model = Pago
        fields = "__all__"
        read_only_fields = ("id_pago", "fecha_pago", "cliente", "sentido")

    # ---- helpers internos ----
    INGRESO_TYPES = {
        "SENIA",
        "SALDO",
        "GARANTIA",
        "DEVOLUCION_TARDIA",
        "OTRO_INGRESO",
    }

    EGRESO_TYPES = {
        "DEVOLUCION_GARANTIA",
        "APLICACION_GARANTIA",
        "OTRO_EGRESO",
    }

    def validate(self, data):
        instance = self.instance

        # Origen final considerando create/update
        pedido = data.get("pedido", getattr(instance, "pedido", None))
        alquiler = data.get("alquiler", getattr(instance, "alquiler", None))

        # Validar que pagos de alquiler/pedido tengan origen
        tipo_pago = data.get("tipo_pago", getattr(instance, "tipo_pago", None))
        tipos_con_origen = [
            "SENIA", "SALDO", "GARANTIA", 
            "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA"
        ]
        
        if tipo_pago in tipos_con_origen:
            if not pedido and not alquiler:
                raise serializers.ValidationError(
                    "El pago debe estar asociado a un Pedido o a un Alquiler."
                )
            if pedido and alquiler:
                raise serializers.ValidationError(
                    "No se puede asociar el mismo pago a un Pedido y un Alquiler a la vez."
                )

        # --- Reglas según tipo_pago ---
        if tipo_pago in ("GARANTIA", "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA"):
            if not alquiler:
                raise serializers.ValidationError(
                    f"El tipo de pago '{tipo_pago}' debe estar asociado a un Alquiler."
                )

        # Estado de garantía automático
        estado_garantia = data.get(
            "estado_garantia",
            getattr(instance, "estado_garantia", None),
        )
        
        if tipo_pago == "GARANTIA":
            data["estado_garantia"] = estado_garantia or "PENDIENTE"
        elif tipo_pago == "DEVOLUCION_GARANTIA":
            data["estado_garantia"] = "DEVUELTA"
        elif tipo_pago == "APLICACION_GARANTIA":
            data["estado_garantia"] = "APLICADA"
        else:
            data["estado_garantia"] = None

        # Sentido según tipo
        if tipo_pago in self.INGRESO_TYPES:
            data["sentido"] = "INGRESO"
        elif tipo_pago in self.EGRESO_TYPES:
            data["sentido"] = "EGRESO"
        else:
            data["sentido"] = "INGRESO"

        return data

    def _infer_cliente_from_origen(self, pedido, alquiler):
        if pedido:
            for attr in ("cliente", "cliente_fk"):
                if hasattr(pedido, attr) and getattr(pedido, attr) is not None:
                    return getattr(pedido, attr)
        if alquiler:
            if hasattr(alquiler, "cliente_fk") and alquiler.cliente_fk:
                return alquiler.cliente_fk
            if hasattr(alquiler, "cliente") and hasattr(alquiler, "cliente_fk") is False:
                return alquiler.cliente
        return None

    def create(self, validated_data):
        pedido = validated_data.get("pedido")
        alquiler = validated_data.get("alquiler")

        if not validated_data.get("cliente"):
            cliente = self._infer_cliente_from_origen(pedido, alquiler)
            if cliente:
                validated_data["cliente"] = cliente

        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)

        if not instance.cliente:
            cliente = self._infer_cliente_from_origen(
                instance.pedido,
                instance.alquiler
            )
            if cliente:
                instance.cliente = cliente
                instance.save(update_fields=["cliente"])

        return instance


class AlquilerSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente', read_only=True)
    
    class Meta:
        model = Alquiler
        fields = '__all__'