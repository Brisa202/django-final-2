from django.contrib import admin
from .models import Cliente


class AutoAdmin(admin.ModelAdmin):
    list_per_page = 25

    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]

    def get_search_fields(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        # Campos típicos para clientes
        candidatos = [
            "nombre", "apellido", "razon_social", "dni",
            "cuit", "email", "telefono"
        ]
        return [n for n in candidatos if n in field_names] or field_names

    def get_list_filter(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        candidatos = ["activo", "tipo", "categoria"]
        return [n for n in candidatos if n in field_names]

    def get_date_hierarchy(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        for name in ("created_at", "fecha_alta", "created"):
            if name in field_names:
                return name
        return None


@admin.register(Cliente)
class ClienteAdmin(AutoAdmin):
    pass

