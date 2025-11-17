from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Incidente
from alquileres.models import DetAlquiler
from pedidos.models import Pedido  # 👈 para actualizar garantía


class IncidenteSerializer(serializers.ModelSerializer):
    # Info de producto/detalle para la UI
    producto_id     = serializers.IntegerField(source='det_alquiler.producto.id', read_only=True)
    producto_nombre = serializers.CharField(source='det_alquiler.producto.nombre', read_only=True)

    class Meta:
        model = Incidente
        fields = (
            'id',
            'det_alquiler', 'producto_id', 'producto_nombre',
            'fecha_incidente', 'descripcion',
            'estado_incidente',          # 'abierto' | 'resuelto' | 'anulado'
            'tipo_incidente',            # 'reparable' | 'irreparable'
            'cantidad_afectada',
            'fecha_resolucion',
            'resultado_final',           # 'sin_accion' | 'repuesto' | 'reintegrado'
            'cantidad_repuesta',
        )
        read_only_fields = ('id', 'fecha_incidente', 'fecha_resolucion')

    # ---------- utilidades internas ----------
    def _sum_incidentes_abiertos_otros(self, det, exclude_pk=None):
        qs = Incidente.objects.filter(det_alquiler=det).exclude(estado_incidente='resuelto')
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        return sum(int(x.cantidad_afectada or 0) for x in qs)

    def _max_disponible_para_incidente(self, det, exclude_pk=None):
        cant_alq = int(det.cantidad or 0)
        usados_otros = self._sum_incidentes_abiertos_otros(det, exclude_pk=exclude_pk)
        return max(0, cant_alq - usados_otros)

    # ---------- validación global ----------
    def validate(self, attrs):
        instance = self.instance

        det = attrs.get('det_alquiler') or getattr(instance, 'det_alquiler', None)
        if not isinstance(det, DetAlquiler):
            raise serializers.ValidationError({'det_alquiler': 'Detalle de alquiler inválido.'})

        tipo    = attrs.get('tipo_incidente',   getattr(instance, 'tipo_incidente',   'reparable'))
        estado  = attrs.get('estado_incidente', getattr(instance, 'estado_incidente', 'abierto'))
        res     = attrs.get('resultado_final',  getattr(instance, 'resultado_final',  'sin_accion'))

        # enteros
        cant_afect = attrs.get('cantidad_afectada', getattr(instance, 'cantidad_afectada', None))
        cant_rep   = attrs.get('cantidad_repuesta', getattr(instance, 'cantidad_repuesta', 0))
        try:
            cant_afect = int(cant_afect)
        except Exception:
            cant_afect = 0
        try:
            cant_rep = int(cant_rep or 0)
        except Exception:
            cant_rep = -1

        if cant_afect <= 0:
            raise serializers.ValidationError({'cantidad_afectada': 'Debe ser un entero mayor a 0.'})
        if cant_rep < 0:
            raise serializers.ValidationError({'cantidad_repuesta': 'No puede ser negativa.'})
        if cant_rep > cant_afect:
            raise serializers.ValidationError({'cantidad_repuesta': 'No puede superar la cantidad afectada.'})

        # tope por otros incidentes abiertos del mismo det
        exclude_pk = instance.pk if instance else None
        max_disp = self._max_disponible_para_incidente(det, exclude_pk=exclude_pk)
        if cant_afect > max_disp:
            raise serializers.ValidationError({
                'cantidad_afectada': (
                    f'No puede superar {max_disp}. '
                    f'(Alquilado: {int(det.cantidad)}, incidentes abiertos de otros: {int(det.cantidad) - max_disp})'
                )
            })

        # reglas de cierre
        if estado == 'resuelto':
            if tipo == 'irreparable' and res == 'reintegrado':
                raise serializers.ValidationError("Un incidente irreparable no puede marcarse como 'reintegrado'.")
            if res == 'repuesto':
                if cant_rep <= 0:
                    raise serializers.ValidationError(
                        {'cantidad_repuesta': "Indique 'cantidad_repuesta' (> 0) para 'repuesto'."}
                    )
                if cant_rep > cant_afect:
                    raise serializers.ValidationError(
                        {'cantidad_repuesta': 'No puede reponerse más de lo afectado.'}
                    )
        return attrs

    # ---------- create/update ----------
    @transaction.atomic
    def create(self, validated_data):
        validated_data.setdefault('estado_incidente', 'abierto')
        validated_data.setdefault('cantidad_repuesta', 0)
        incidente = super().create(validated_data)  # el modelo descuenta stock en save()
        return incidente

    @transaction.atomic
    def update(self, instance: Incidente, validated_data):
        prev_estado = instance.estado_incidente
        new_estado  = validated_data.get('estado_incidente', instance.estado_incidente)
        resultado   = validated_data.get('resultado_final', instance.resultado_final)

        # aplicar cambios simples
        for k, v in validated_data.items():
            setattr(instance, k, v)

        # transición a RESUELTO → efectos de stock y garantía
        if prev_estado != 'resuelto' and new_estado == 'resuelto':
            if resultado == 'reintegrado':
                instance._devolver_reintegrado()
            elif resultado == 'repuesto':
                instance._devolver_repuesto()

            # Garantía del pedido: si el resultado implica costo → descontada
            alq = instance.det_alquiler.alquiler
            if alq and alq.pedido_id and resultado in ('repuesto',):  # agrega 'descontado' si lo usás
                Pedido.objects.filter(pk=alq.pedido_id).update(garantia_estado='descontada')

            instance.fecha_resolucion = timezone.now()

        instance.save()
        return instance
