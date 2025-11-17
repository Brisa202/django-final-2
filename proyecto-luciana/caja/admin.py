# caja/admin.py
from django.contrib import admin
from .models import Caja, HistorialCaja


@admin.register(Caja)
class CajaAdmin(admin.ModelAdmin):
    list_display = ('id_caja', 'empleado', 'usuario_apertura', 'estado', 'fecha_apertura', 'fecha_cierre', 'obtener_balance_total_teorico')
    list_filter = ('estado', 'fecha_apertura', 'empleado')
    readonly_fields = ('fecha_apertura', 'fecha_cierre', 'diferencia_efectivo', 'diferencia_transferencia')
    
    fieldsets = (
        ('Información de Apertura', {
            'fields': ('empleado', 'usuario_apertura', 'fecha_apertura', 'estado', 'notas_apertura')
        }),
        ('Dinero Inicial', {
            'fields': ('monto_inicial_efectivo', 'monto_inicial_transferencia')
        }),
        ('Información de Cierre', {
            'fields': ('usuario_cierre', 'fecha_cierre', 'notas_cierre')
        }),
        ('Arqueo Final', {
            'fields': ('monto_final_efectivo', 'monto_final_transferencia', 'diferencia_efectivo', 'diferencia_transferencia')
        }),
    )
    
    def obtener_balance_total_teorico(self, obj):
        return f"${obj.obtener_balance_total_teorico():.2f}"
    obtener_balance_total_teorico.short_description = 'Balance Teórico'


@admin.register(HistorialCaja)
class HistorialCajaAdmin(admin.ModelAdmin):
    list_display = ('id_evento', 'caja', 'tipo_evento', 'timestamp', 'usuario')
    list_filter = ('tipo_evento', 'timestamp', 'caja')
    readonly_fields = ('timestamp', 'caja', 'tipo_evento', 'descripcion', 'detalles', 'usuario')
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
