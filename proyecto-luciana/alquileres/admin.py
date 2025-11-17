from django.contrib import admin
from .models import Alquiler, DetAlquiler, Cargo  # 👈 sacamos Pago


@admin.register(Alquiler)
class AlquilerAdmin(admin.ModelAdmin):
    list_display = ("id", "cliente", "estado", "creado_en")
    search_fields = ("cliente",)
    list_filter = ("estado",)


@admin.register(DetAlquiler)
class DetAlquilerAdmin(admin.ModelAdmin):
    list_display = ("id", "alquiler", "producto", "cantidad", "precio_unit")


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ("id", "pedido", "origen", "monto", "creado_en")
    list_filter = ("origen",)
