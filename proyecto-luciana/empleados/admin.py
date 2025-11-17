from django.contrib import admin

# Register your models here.
# empleados/admin.py
from django.contrib import admin
from .models import Empleado

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display  = ('id_empleados', 'apellido', 'nombre', 'dni', 'telefono', 'fecha_ingreso', 'fecha_egreso', 'activo')
    list_filter   = ('activo', 'fecha_ingreso', 'fecha_egreso')
    search_fields = ('apellido', 'nombre', 'dni')
