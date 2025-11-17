from rest_framework import serializers
from .models import Entrega, DetEntrega
from alquileres.models import Alquiler
from empleados.models import Empleado


class EmpleadoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empleado
        fields = ('id_empleados', 'nombre', 'apellido')


class DetEntregaSerializer(serializers.ModelSerializer):
    empleado_data = EmpleadoSimpleSerializer(source='empleado', read_only=True)

    class Meta:
        model = DetEntrega
        fields = (
            'id_det_entregas',
            'entrega',
            'empleado',
            'empleado_data',
            'cantidad_entregada',
        )


class EntregaSerializer(serializers.ModelSerializer):
    alquiler_id = serializers.PrimaryKeyRelatedField(
        source='alquiler',
        queryset=Alquiler.objects.all()
    )

    responsable_principal_id = serializers.PrimaryKeyRelatedField(
        source='responsable_principal',
        queryset=Empleado.objects.filter(activo=True),
        required=False,
        allow_null=True,
        write_only=True
    )

    responsable_principal = EmpleadoSimpleSerializer(read_only=True)

    class Meta:
        model = Entrega
        fields = (
            'id_entrega',
            'alquiler_id',
            'fecha_hora_entrega',
            'fecha_hora_entrega_real',
            'direccion',
            'estado_entrega',
            'responsable_principal',
            'responsable_principal_id',
            'creado_en',
            'actualizado_en',
        )
        read_only_fields = ('fecha_hora_entrega_real',)


class EntregaDetailSerializer(EntregaSerializer):
    detalles = DetEntregaSerializer(many=True, read_only=True)

    class Meta(EntregaSerializer.Meta):
        fields = EntregaSerializer.Meta.fields + ('detalles',)
