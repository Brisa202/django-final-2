from rest_framework import serializers
from .models import Alquiler, DetAlquiler
from incidentes.models import Incidente
from decimal import Decimal


class DetAlquilerSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetAlquiler
        fields = ('id', 'producto', 'producto_nombre', 'cantidad', 'precio_unit')


class AlquilerSerializer(serializers.ModelSerializer):
    items = DetAlquilerSerializer(many=True, read_only=True)
    incidentes_abiertos = serializers.SerializerMethodField()
    
    # ✅ CAMPOS CALCULADOS
    cliente_nombre = serializers.SerializerMethodField()
    monto_total = serializers.SerializerMethodField()
    garantia_monto = serializers.SerializerMethodField()

    # 👉 PARA ENTREGAS (copiados desde Pedido)
    direccion_evento = serializers.SerializerMethodField()
    tipo_entrega = serializers.SerializerMethodField()
    fecha_hora_evento = serializers.SerializerMethodField()

    class Meta:
        model = Alquiler
        fields = (
            'id', 'estado', 'cliente', 'cliente_fk', 'pedido', 'creado_en', 'items',
            # garantía
            'garantia_estado', 'garantia_monto_cobrado', 'garantia_metodo',
            'garantia_nota', 'garantia_fecha_cobro',
            # incidentes
            'incidentes_abiertos',
            # ✅ NUEVOS
            'cliente_nombre', 'monto_total', 'garantia_monto',
            # 👉 PARA ENTREGAS
            'direccion_evento', 'tipo_entrega', 'fecha_hora_evento',
        )
        read_only_fields = ('garantia_fecha_cobro',)

    def get_incidentes_abiertos(self, obj):
        return Incidente.objects.filter(
            det_alquiler__alquiler=obj,
            estado_incidente='abierto'
        ).count()

    def get_cliente_nombre(self, obj):
        """
        Retorna el nombre del cliente desde cliente_fk o desde el campo texto 'cliente'
        """
        if obj.cliente_fk:
            return obj.cliente_fk.nombre
        return obj.cliente or "Sin cliente"

    def get_monto_total(self, obj):
        """
        Calcula el total del alquiler sumando (cantidad × precio_unit) de todos los items
        """
        total = Decimal('0')
        for item in obj.items.all():
            total += Decimal(str(item.cantidad)) * Decimal(str(item.precio_unit))
        return float(total)

    def get_garantia_monto(self, obj):
        """
        Obtiene el monto de garantía desde:
        1. El campo garantia_monto_cobrado del alquiler (si existe)
        2. El pedido vinculado (pedido.garantia_monto)
        3. Retorna 0 si no hay ninguno
        """
        # Primero intentamos desde el alquiler mismo
        if obj.garantia_monto_cobrado:
            return float(obj.garantia_monto_cobrado)
        
        # Si no, intentamos desde el pedido vinculado
        if obj.pedido and hasattr(obj.pedido, 'garantia_monto') and obj.pedido.garantia_monto:
            return float(obj.pedido.garantia_monto)
        
        return 0.0

    # 👉 NUEVOS PARA ENTREGAS

    def get_direccion_evento(self, obj):
        if obj.pedido and hasattr(obj.pedido, "direccion_evento"):
            return obj.pedido.direccion_evento or ""
        return ""

    def get_tipo_entrega(self, obj):
        if obj.pedido and hasattr(obj.pedido, "tipo_entrega"):
            return obj.pedido.tipo_entrega
        return None

    def get_fecha_hora_evento(self, obj):
        if obj.pedido and hasattr(obj.pedido, "fecha_hora_evento") and obj.pedido.fecha_hora_evento:
            return obj.pedido.fecha_hora_evento
        return None


# === Validaciones de garantía para actualización simple (sin cobro)
class AlquilerGarantiaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alquiler
        fields = ('garantia_estado', 'garantia_monto_cobrado', 'garantia_metodo', 'garantia_nota')

    def validate(self, attrs):
        inst = self.instance
        nuevo_estado = attrs.get('garantia_estado', inst.garantia_estado)

        if inst and inst.garantia_estado in ('devuelta', 'descontada') and nuevo_estado == 'pendiente':
            raise serializers.ValidationError('No se puede volver a "pendiente" una garantía ya cerrada.')

        if nuevo_estado == 'descontada':
            monto = attrs.get('garantia_monto_cobrado') or inst.garantia_monto_cobrado
            if not monto or monto <= 0:
                raise serializers.ValidationError('Para "descontada" se requiere un monto > 0.')
        return attrs


class CobroGarantiaSerializer(serializers.Serializer):
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    metodo = serializers.ChoiceField(choices=[('efectivo','efectivo'), ('transferencia','transferencia'), ('tarjeta','tarjeta')])
    nota = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError('El monto debe ser mayor a 0.')
        return value






