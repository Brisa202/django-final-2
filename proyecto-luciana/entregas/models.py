from django.db import models
from alquileres.models import Alquiler
from empleados.models import Empleado


class Entrega(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('en_camino', 'En camino'),
        ('entregado', 'Entregado'),
        ('no_entregado', 'No entregado'),
        ('cancelado', 'Cancelado'),
    ]

    id_entrega = models.AutoField(primary_key=True)

    alquiler = models.ForeignKey(
        Alquiler,
        on_delete=models.CASCADE,
        related_name='entregas'
    )

    # Fecha/hora planificada
    fecha_hora_entrega = models.DateTimeField()

    # Fecha/hora real, cuando el chofer confirma la entrega
    fecha_hora_entrega_real = models.DateTimeField(null=True, blank=True)

    direccion = models.CharField(max_length=255)

    estado_entrega = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='pendiente'
    )

    # Responsable principal (chofer)
    responsable_principal = models.ForeignKey(
        Empleado,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entregas_responsable'
    )

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Entrega'
        verbose_name_plural = 'Entregas'
        ordering = ['-fecha_hora_entrega', '-id_entrega']

    def __str__(self):
        return f"Entrega #{self.id_entrega} - Alquiler {self.alquiler_id}"


class DetEntrega(models.Model):
    id_det_entregas = models.AutoField(primary_key=True)

    entrega = models.ForeignKey(
        Entrega,
        on_delete=models.CASCADE,
        related_name='detalles'
    )

    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.PROTECT,
        related_name='detalles_entrega'
    )

    # Si tu DER lo pide, lo dejamos. Si ves que no aplica, se puede remover.
    cantidad_entregada = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Detalle de entrega'
        verbose_name_plural = 'Detalles de entregas'

    def __str__(self):
        return f"DetEntrega #{self.id_det_entregas} - Entrega {self.entrega_id}"
