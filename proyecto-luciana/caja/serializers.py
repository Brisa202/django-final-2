# caja/serializers.py
from rest_framework import serializers
from .models import Caja, HistorialCaja


class HistorialCajaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = HistorialCaja
        fields = ['id_evento', 'tipo_evento', 'descripcion', 'detalles', 'timestamp', 'usuario_nombre']


class CajaSerializer(serializers.ModelSerializer):
    usuario_apertura_nombre = serializers.CharField(source='usuario_apertura.get_full_name', read_only=True)
    usuario_cierre_nombre = serializers.CharField(source='usuario_cierre.get_full_name', read_only=True, allow_null=True)
    empleado_nombre = serializers.CharField(source='empleado.nombre', read_only=True)
    empleado_id = serializers.IntegerField(source='empleado.id_empleado', read_only=True)
    
    ingresos_efectivo = serializers.SerializerMethodField()
    ingresos_transferencia = serializers.SerializerMethodField()
    total_ingresos = serializers.SerializerMethodField()
    
    egresos_efectivo = serializers.SerializerMethodField()
    egresos_transferencia = serializers.SerializerMethodField()
    total_egresos = serializers.SerializerMethodField()
    
    balance_efectivo_teorico = serializers.SerializerMethodField()
    balance_transferencia_teorico = serializers.SerializerMethodField()
    balance_total_teorico = serializers.SerializerMethodField()
    
    historial = HistorialCajaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Caja
        fields = [
            'id_caja', 'usuario_apertura_nombre', 'usuario_cierre_nombre',
            'empleado', 'empleado_nombre', 'empleado_id',
            'fecha_apertura', 'fecha_cierre', 'estado',
            'monto_inicial_efectivo', 'monto_inicial_transferencia',
            'ingresos_efectivo', 'ingresos_transferencia', 'total_ingresos',
            'egresos_efectivo', 'egresos_transferencia', 'total_egresos',
            'balance_efectivo_teorico', 'balance_transferencia_teorico', 'balance_total_teorico',
            'monto_final_efectivo', 'monto_final_transferencia',
            'diferencia_efectivo', 'diferencia_transferencia',
            'notas_apertura', 'notas_cierre', 'historial'
        ]
    
    def get_ingresos_efectivo(self, obj):
        return float(obj.obtener_ingresos_efectivo())
    
    def get_ingresos_transferencia(self, obj):
        return float(obj.obtener_ingresos_transferencia())
    
    def get_total_ingresos(self, obj):
        return float(obj.obtener_total_ingresos())
    
    def get_egresos_efectivo(self, obj):
        return float(obj.obtener_egresos_efectivo())
    
    def get_egresos_transferencia(self, obj):
        return float(obj.obtener_egresos_transferencia())
    
    def get_total_egresos(self, obj):
        return float(obj.obtener_total_egresos())
    
    def get_balance_efectivo_teorico(self, obj):
        return float(obj.obtener_balance_efectivo_teorico())
    
    def get_balance_transferencia_teorico(self, obj):
        return float(obj.obtener_balance_transferencia_teorico())
    
    def get_balance_total_teorico(self, obj):
        return float(obj.obtener_balance_total_teorico())