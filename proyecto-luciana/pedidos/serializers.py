from rest_framework import serializers
from decimal import Decimal
from .models import Pedido, DetPedido
from clientes.serializers import ClienteSerializer


# =========================================================
# ITEM PEDIDO (para crear)
# =========================================================
class ItemPedidoSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)


# =========================================================
# CREAR PEDIDO
# =========================================================
class PedidoCreateSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    items = ItemPedidoSerializer(many=True)

    fecha_hora_evento = serializers.DateTimeField()
    fecha_hora_devolucion = serializers.DateTimeField()

    # === CAMPOS DE ENTREGA ===
    tipo_entrega = serializers.ChoiceField(
        choices=[('retiro', 'retiro'), ('envio', 'envio')],
        required=False,
        default='retiro'
    )
    direccion_evento = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True
    )
    referencia_entrega = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True
    )

    # Económicos
    senia = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    forma_pago = serializers.ChoiceField(
        choices=[('efectivo', 'Efectivo'),
                 ('transferencia', 'Transferencia'),
                 ('tarjeta', 'Tarjeta')],
        required=False,
        allow_null=True
    )

    # Seña (archivo opcional)
    comprobante_url = serializers.URLField(required=False, allow_blank=True)

    # -------- GARANTÍA --------
    garantia_monto = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    garantia_tipo = serializers.ChoiceField(
        choices=[('dni', 'dni'), ('servicio', 'servicio'), ('otro', 'otro')],
        required=False,
        allow_null=True
    )
    garantia_estado = serializers.ChoiceField(
        choices=[
            ('pendiente', 'pendiente'),
            ('devuelta', 'devuelta'),
            ('descontada', 'descontada')
        ],
        required=False,
        allow_null=True
    )

    # URLs opcionales
    garantia_dni_url = serializers.URLField(required=False, allow_blank=True)
    garantia_serv_url = serializers.URLField(required=False, allow_blank=True)
    garantia_otro_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Calcular garantía automática si no se pasa
        if attrs.get("garantia_monto", 0) == 0:
            pedido_total = attrs.get('total', 0)
            attrs['garantia_monto'] = pedido_total * Decimal('0.15')

        return attrs


# =========================================================
# DETALLE DE ITEM PEDIDO (para mostrar)
# =========================================================
class DetPedidoOutSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = DetPedido
        fields = (
            'id',
            'producto',
            'producto_nombre',
            'cantidad',
            'precio_unit',
            'subtotal',
        )

    def get_subtotal(self, obj):
        return obj.cantidad * obj.precio_unit


# =========================================================
# LISTADO DE PEDIDOS
# =========================================================
class PedidoOutSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    cliente_telefono = serializers.CharField(source="cliente.telefono", read_only=True)
    cliente_direccion = serializers.CharField(source="cliente.direccion", read_only=True)

    class Meta:
        model = Pedido
        fields = (
            "id",
            "cliente",
            "cliente_nombre",
            "cliente_telefono",
            "cliente_direccion",
            "estado",
            "fecha_hora_evento",
            "fecha_hora_devolucion",
            # === CAMPOS DE ENTREGA ===
            "tipo_entrega",
            "direccion_evento",
            "referencia_entrega",
            # ========================
            "total",
            "senia",
            "forma_pago",
            "garantia_monto",
            "garantia_estado",
            "garantia_tipo",
            "costo_flete",
        )

    def get_cliente_nombre(self, obj):
        try:
            return f"{obj.cliente.nombre} {obj.cliente.apellido}".strip()
        except AttributeError:
            return ""


# =========================================================
# DETALLE DE PEDIDO
# =========================================================
class PedidoDetailSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    cliente_telefono = serializers.CharField(source="cliente.telefono", read_only=True)
    cliente_email = serializers.CharField(source="cliente.email", read_only=True)
    cliente_direccion = serializers.CharField(source="cliente.direccion", read_only=True)
    cliente_data = ClienteSerializer(source="cliente", read_only=True)

    detalles = DetPedidoOutSerializer(many=True, read_only=True)
    saldo = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    # URLs absolutas
    comprobante_url = serializers.SerializerMethodField()
    garantia_dni_url = serializers.SerializerMethodField()
    garantia_serv_url = serializers.SerializerMethodField()
    garantia_otro_url = serializers.SerializerMethodField()

    # Garantía cobrada
    garantia_monto_cobrado = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = (
            "id",
            "estado",
            "cliente",
            "cliente_nombre",
            "cliente_telefono",
            "cliente_email",
            "cliente_direccion",
            "cliente_data",
            "fecha_hora_evento",
            "fecha_hora_devolucion",
            # === CAMPOS DE ENTREGA ===
            "tipo_entrega",
            "direccion_evento",
            "referencia_entrega",
            # ========================
            "total",
            "senia",
            "forma_pago",
            "comprobante_url",
            "comprobante_file",
            "garantia_monto",
            "garantia_tipo",
            "garantia_estado",
            "garantia_dni_url",
            "garantia_dni_file",
            "garantia_serv_url",
            "garantia_serv_file",
            "garantia_otro_url",
            "garantia_otro_file",
            "garantia_descuento",
            "garantia_motivo",
            "garantia_monto_cobrado",
            "detalles",
            "saldo",
            "costo_flete",
            "creado_en",
        )

    def get_cliente_nombre(self, obj):
        try:
            return f"{obj.cliente.nombre} {obj.cliente.apellido}".strip()
        except AttributeError:
            return ""

    # ---------- URLs absolutas ----------
    def _abs_url(self, field):
        request = self.context.get("request")
        if not request:
            return None
        file = getattr(self.instance, field, None)
        if file and hasattr(file, "url"):
            return request.build_absolute_uri(file.url)
        return None

    def get_comprobante_url(self, obj):
        return self._abs_url("comprobante_file")

    def get_garantia_dni_url(self, obj):
        return self._abs_url("garantia_dni_file")

    def get_garantia_serv_url(self, obj):
        return self._abs_url("garantia_serv_file")

    def get_garantia_otro_url(self, obj):
        return self._abs_url("garantia_otro_file")

    def get_garantia_monto_cobrado(self, obj):
        if getattr(obj, 'garantia_estado', '') == 'descontada':
            return float(getattr(obj, 'garantia_descuento', 0) or 0)
        return 0


# =========================================================
# ACTUALIZAR PEDIDO
# =========================================================
class PedidoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pedido
        fields = (
            "estado",
            "fecha_hora_evento",
            "fecha_hora_devolucion",
            # === CAMPOS DE ENTREGA ===
            "tipo_entrega",
            "direccion_evento",
            "referencia_entrega",
            # ========================
            "senia",
            "forma_pago",
            "comprobante_url",
            "comprobante_file",
            "garantia_monto",
            "garantia_tipo",
            "garantia_estado",
            "garantia_dni_url",
            "garantia_dni_file",
            "garantia_serv_url",
            "garantia_serv_file",
            "garantia_otro_url",
            "garantia_otro_file",
            "garantia_descuento",
            "garantia_motivo",
        )
        extra_kwargs = {f: {"required": False} for f in fields}

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        ev = attrs.get("fecha_hora_evento", None)
        dev = attrs.get("fecha_hora_devolucion", None)

        if instance:
            if ev is None:
                ev = instance.fecha_hora_evento
            if dev is None:
                dev = instance.fecha_hora_devolucion

        if ev and dev and dev <= ev:
            raise serializers.ValidationError({
                "fecha_hora_devolucion": "La devolución debe ser posterior al evento."
            })

        if (sen := attrs.get("senia", None)) is not None and sen < 0:
            raise serializers.ValidationError({"senia": "La seña no puede ser negativa."})

        if (gar := attrs.get("garantia_monto", None)) is not None and gar < 0:
            raise serializers.ValidationError({"garantia_monto": "La garantía no puede ser negativa."})

        if attrs.get("garantia_estado") == "descontada":
            desc = attrs.get(
                "garantia_descuento",
                instance.garantia_descuento if instance else None
            )
            if desc is None or desc < 0:
                raise serializers.ValidationError({
                    "garantia_descuento": "Indicá el monto descontado (>= 0)."
                })
        return attrs
