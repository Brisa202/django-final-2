from django.contrib import admin
from .models import Entrega


class AutoAdmin(admin.ModelAdmin):
    list_per_page = 25

    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]

    def get_search_fields(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        # Campos típicos en entregas
        candidatos = [
            "cliente", "nombre_cliente", "pedido", "alquiler",
            "direccion", "direccion_entrega"
        ]
        return [n for n in candidatos if n in field_names] or field_names

    def get_list_filter(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        candidatos = ["estado", "tipo", "forma_entrega"]
        return [n for n in candidatos if n in field_names]

    def get_date_hierarchy(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        for name in ("fecha_entrega", "fecha", "created_at", "created"):
            if name in field_names:
                return name
        return None


@admin.register(Entrega)
class EntregaAdmin(AutoAdmin):
    pass

