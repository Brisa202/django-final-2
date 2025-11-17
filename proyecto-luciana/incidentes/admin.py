# incidentes/admin.py
from django.contrib import admin, messages
from django.db import transaction
from django.utils import timezone

from .models import Incidente

@admin.register(Incidente)
class IncidenteAdmin(admin.ModelAdmin):
    """
    Admin mejorado con:
    - Columnas: producto, alquiler y pedido asociados
    - Filtros: estado, tipo, resultado, fechas
    - Acciones: marcar resuelto (reintegrado / repuesto)
    """
    list_display = (
        'id',
        'producto_nombre_col',
        'alquiler_id_col',
        'pedido_id_col',
        'estado_incidente',
        'tipo_incidente',
        'resultado_final',
        'cantidad_afectada',
        'cantidad_repuesta',
        'fecha_incidente',
        'fecha_resolucion',
    )
    list_filter = (
        'estado_incidente',
        'tipo_incidente',
        'resultado_final',
        ('fecha_incidente', admin.DateFieldListFilter),
        ('fecha_resolucion', admin.DateFieldListFilter),
    )
    search_fields = (
        'descripcion',
        'det_alquiler__producto__nombre',
        'det_alquiler__alquiler__cliente',
    )
    readonly_fields = ('fecha_incidente', 'fecha_resolucion')

    actions = ['accion_resuelto_reintegrado', 'accion_resuelto_repuesto']

    # ----- Column helpers -----
    def producto_nombre_col(self, obj: Incidente):
        try:
            return obj.det_alquiler.producto.nombre
        except Exception:
            return '—'
    producto_nombre_col.short_description = 'Producto'

    def alquiler_id_col(self, obj: Incidente):
        try:
            return obj.det_alquiler.alquiler_id
        except Exception:
            return '—'
    alquiler_id_col.short_description = 'Alquiler #'

    def pedido_id_col(self, obj: Incidente):
        return obj.pedido_id or '—'
    pedido_id_col.short_description = 'Pedido #'

    # ----- Admin actions -----
    @transaction.atomic
    def accion_resuelto_reintegrado(self, request, queryset):
        """
        Marca seleccionados como RESUELTO con resultado REINTEGRADO:
        - Devuelve al stock la cantidad afectada.
        - No cambia la garantía aquí (la decide 'finalizar alquiler').
        """
        count_ok = 0
        for inc in queryset.select_related('det_alquiler__producto'):
            # sólo si no estaba ya resuelto
            if inc.estado_incidente == 'resuelto':
                continue
            # efectos de stock
            inc._devolver_reintegrado()
            # estado + fecha + resultado
            inc.estado_incidente = 'resuelto'
            inc.resultado_final = 'reintegrado'
            inc.fecha_resolucion = timezone.now()
            inc.save(update_fields=['estado_incidente', 'resultado_final', 'fecha_resolucion'])
            count_ok += 1
        self.message_user(request, f"{count_ok} incidente(s) marcados como resueltos (reintegrado).", level=messages.SUCCESS)
    accion_resuelto_reintegrado.short_description = "Marcar como RESUELTO (reintegrado)"

    @transaction.atomic
    def accion_resuelto_repuesto(self, request, queryset):
        """
        Marca seleccionados como RESUELTO con resultado REPUESTO:
        - Suma al stock la cantidad repuesta (si es 0, usa cantidad_afectada).
        - Si hay pedido vinculado, marca garantía como DESCONTADA.
        """
        from pedidos.models import Pedido  # import local para evitar ciclos en import
        count_ok = 0
        for inc in queryset.select_related('det_alquiler__producto'):
            if inc.estado_incidente == 'resuelto':
                continue
            # cantidad a reponer por defecto
            if not inc.cantidad_repuesta or inc.cantidad_repuesta <= 0:
                inc.cantidad_repuesta = inc.cantidad_afectada
            # stock
            inc._devolver_repuesto()
            # estado + fecha + resultado
            inc.estado_incidente = 'resuelto'
            inc.resultado_final = 'repuesto'
            inc.fecha_resolucion = timezone.now()
            inc.save(update_fields=['estado_incidente', 'resultado_final', 'fecha_resolucion', 'cantidad_repuesta'])
            # garantía: descontada si hay pedido
            if inc.pedido_id:
                Pedido.objects.filter(pk=inc.pedido_id).update(garantia_estado='descontada')
            count_ok += 1
        self.message_user(request, f"{count_ok} incidente(s) marcados como resueltos (repuesto).", level=messages.SUCCESS)
    accion_resuelto_repuesto.short_description = "Marcar como RESUELTO (repuesto)"
