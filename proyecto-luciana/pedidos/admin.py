from django.contrib import admin
from .models import Pedido, DetPedido

class DetPedidoInline(admin.TabularInline):
    model = DetPedido
    extra = 0

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = (
        "id", "cliente", "estado",
        "fecha_hora_evento", "fecha_hora_devolucion",
        "total", "senia", "garantia_monto", "garantia_estado",
        "costo_flete"  # Mostrar el costo de flete
    )
    list_filter = ("estado", "fecha_hora_evento", "garantia_estado")  # Filtro por zona
    search_fields = ("id", "cliente__nombre", "cliente__apellido")
    # 🔹 Si antes fallaba el admin por zonas horarias, mantenelo comentado
    # date_hierarchy = "fecha_hora_evento"

    readonly_fields = ("total", "creado_en", "costo_flete")  # Costo flete como solo lectura

    fieldsets = (
        ("Datos del pedido", {
            "fields": (
                "cliente", "estado",
                "fecha_hora_evento", "fecha_hora_devolucion",
                "creado_en"
            )
        }),
        ("Económicos", {
            "fields": ("total", "senia", "forma_pago", "costo_flete")  # Mostrar costo flete en el admin
        }),
        ("Comprobante de seña", {
            # 👇 solo dejamos los campos que sí existen actualmente
            "fields": ("comprobante_file",)
        }),
        ("Garantía", {
            "fields": ("garantia_monto", "garantia_estado")
         
        }),
    )

    inlines = [DetPedidoInline]

