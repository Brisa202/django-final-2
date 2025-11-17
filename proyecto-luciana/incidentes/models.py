# incidentes/models.py
from django.db import models, transaction
from django.core.exceptions import ValidationError
from alquileres.models import DetAlquiler

class Incidente(models.Model):
    ESTADOS = (
        ('abierto', 'Abierto'),
        ('resuelto', 'Resuelto'),
        ('anulado', 'Anulado'),
    )
    TIPOS = (
        ('irreparable', 'Daño irreparable (rotura, pérdida)'),
        ('reparable',   'Daño reparable (suciedad, arreglo)'),
    )
    RESULTADOS = (
        ('sin_accion',  'Sin acción (no vuelve)'),
        ('reintegrado', 'Reintegrado al stock (reparado)'),
        ('repuesto',    'Repuesto por compra/alta'),
    )

    det_alquiler      = models.ForeignKey(DetAlquiler, on_delete=models.PROTECT, related_name='incidentes')
    fecha_incidente   = models.DateTimeField(auto_now_add=True)
    descripcion       = models.TextField(blank=True)
    estado_incidente  = models.CharField(max_length=10, choices=ESTADOS, default='abierto')
    tipo_incidente    = models.CharField(max_length=12, choices=TIPOS, default='reparable')

    # Cuánto stock queda fuera de servicio por este incidente
    cantidad_afectada = models.PositiveIntegerField(default=1)

    # Datos de resolución
    fecha_resolucion  = models.DateTimeField(null=True, blank=True)
    resultado_final   = models.CharField(max_length=20, choices=RESULTADOS, default='sin_accion')
    cantidad_repuesta = models.PositiveIntegerField(default=0)  # si “repuesto”

    class Meta:
        ordering = ['-fecha_incidente']

    def __str__(self):
        return f"Incidente #{self.pk} {self.get_estado_incidente_display()}"

    # Acceso cómodo al pedido asociado (si existe)
    @property
    def pedido_id(self):
        alq = getattr(self.det_alquiler, 'alquiler', None)
        return getattr(alq, 'pedido_id', None)

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_create = self._state.adding
        super().save(*args, **kwargs)

        # Al CREAR: sacar del stock lo afectado (queda fuera de servicio)
        if is_create:
            prod = self.det_alquiler.producto
            qty  = self.cantidad_afectada
            if prod.stock < qty:
                raise ValidationError("Stock insuficiente para registrar el incidente.")
            prod.stock = prod.stock - qty
            prod.save(update_fields=['stock'])

    def _devolver_reintegrado(self):
        """ Devuelve al stock lo afectado (caso reparable). """
        prod = self.det_alquiler.producto
        prod.stock = prod.stock + self.cantidad_afectada
        prod.save(update_fields=['stock'])

    def _devolver_repuesto(self):
        """ Suma al stock lo que se repuso (normalmente = afectada, pero puede variar). """
        if self.cantidad_repuesta <= 0:
            raise ValidationError("Para resultado 'repuesto' debe informar cantidad_repuesta > 0.")
        prod = self.det_alquiler.producto
        prod.stock = prod.stock + self.cantidad_repuesta
        prod.save(update_fields=['stock'])
