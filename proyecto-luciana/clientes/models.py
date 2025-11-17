# clientes/models.py
from django.db import models

class Cliente(models.Model):
  nombre     = models.CharField(max_length=120)
  apellido   = models.CharField(max_length=120, blank=True)
  documento  = models.CharField(max_length=30, blank=True)   # DNI/CUIT
  telefono   = models.CharField(max_length=40, blank=True)
  email      = models.EmailField(blank=True)
  direccion  = models.CharField(max_length=255, blank=True)
  notas      = models.TextField(blank=True)
  activo     = models.BooleanField(default=True)
  creado_en  = models.DateTimeField(auto_now_add=True)

  def __str__(self):
      return f"{self.nombre} {self.apellido}".strip()
