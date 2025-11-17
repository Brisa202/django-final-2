# empleados/models.py
from django.db import models
from django.contrib.auth.models import User

class Empleado(models.Model):
    id_empleados  = models.AutoField(primary_key=True)
    usuario       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='empleado')
    nombre        = models.CharField(max_length=100)
    apellido      = models.CharField(max_length=100)
    dni           = models.CharField(max_length=20, unique=True)
    telefono      = models.CharField(max_length=20)
    fecha_ingreso = models.DateField()
    fecha_egreso  = models.DateField(null=True, blank=True)
    direccion     = models.CharField(max_length=255)
    activo        = models.BooleanField(default=True)  # útil para bajas sin borrar

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["apellido", "nombre"]

    def __str__(self):
        return f"{self.apellido}, {self.nombre} ({self.dni})"
