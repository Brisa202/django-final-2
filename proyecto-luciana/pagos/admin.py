from django.contrib import admin
from .models import Pago


class AutoAdmin(admin.ModelAdmin):
    """
    ModelAdmin genérico:
    - Muestra todos los campos en list_display
    - Intenta armar search_fields y list_filter automáticamente
    """
    list_per_page = 25

    def get_list_display(self, request):
        # Todos los campos del modelo
        return [field.name for field in self.model._meta.fields]

    def get_search_fields(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        # Campos típicos para buscar en pagos
        candidatos = [
            "cliente", "nombre_cliente", "descripcion", "detalle",
            "referencia", "comprobante"
        ]
        return [n for n in candidatos if n in field_names] or field_names

    def get_list_filter(self, request):
        field_names = [f.name for f in self.model._meta.fields]
        # Campos típicos para filtrar en pagos
        candidatos = ["metodo", "metodo_pago", "tipo", "estado"]
        return [n for n in candidatos if n in field_names]

    def get_date_hierarchy(self, request):
        # Usa fecha / created / created_at si existe
        field_names = [f.name for f in self.model._meta.fields]
        for name in ("fecha", "created_at", "created"):
            if name in field_names:
                return name
        return None


@admin.register(Pago)
class PagoAdmin(AutoAdmin):
    pass

