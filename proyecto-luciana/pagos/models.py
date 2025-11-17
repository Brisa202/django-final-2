#models.py/pagos#
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from clientes.models import Cliente
from pedidos.models import Pedido
from alquileres.models import Alquiler


class Pago(models.Model):
    """
    Modelo unificado para TODOS los movimientos de dinero.
    Reemplaza completamente el registro manual en Caja.
    """
    
    # ========== TIPOS DE PAGO ==========
    TIPO_CHOICES = (
        # INGRESOS de alquileres/pedidos
        ("SENIA", "Seña / Anticipo"),
        ("SALDO", "Saldo"),
        ("GARANTIA", "Garantía cobrada"),
        ("DEVOLUCION_TARDIA", "Cobro por devolución tardía"),
        ("OTRO_INGRESO", "Otro ingreso"),
        
        # EGRESOS de alquileres
        ("DEVOLUCION_GARANTIA", "Devolución garantía"),
        ("APLICACION_GARANTIA", "Garantía aplicada a daños"),
        ("OTRO_EGRESO", "Otro egreso"),
    )

    # ========== MEDIOS DE PAGO ==========
    METODOS = (
        ("EFECTIVO", "Efectivo"),
        ("TRANSFERENCIA", "Transferencia"),
    )

    # ========== SENTIDO (INGRESO/EGRESO) ==========
    SENTIDO_CHOICES = (
        ("INGRESO", "Ingreso"),
        ("EGRESO", "Egreso"),
    )

    # ========== ESTADOS DE GARANTÍA ==========
    GARANTIA_ESTADOS = (
        ("PENDIENTE", "Pendiente"),
        ("DEVUELTA", "Devuelta"),
        ("APLICADA", "Aplicada"),
    )

    # ========== CAMPOS ==========
    id_pago = models.AutoField(primary_key=True)
    fecha_pago = models.DateTimeField(default=timezone.now)

    # Origen del pago (opcional, solo para pagos de alquileres/pedidos)
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pagos",
    )
    alquiler = models.ForeignKey(
        Alquiler,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pagos",
    )

    # Cliente (opcional, se infiere automáticamente de pedido/alquiler)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pagos",
    )

    # Clasificación del pago
    tipo_pago = models.CharField(max_length=30, choices=TIPO_CHOICES)
    sentido = models.CharField(
        max_length=10,
        choices=SENTIDO_CHOICES,
        default="INGRESO",
    )

    # Importe y medio de pago
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODOS)

    # Referencia (para transferencias, nro operación, etc.)
    comprobante_pago = models.CharField(max_length=120, blank=True)
    notas = models.CharField(max_length=255, blank=True)

    # Estado de garantía (solo para pagos tipo garantía)
    estado_garantia = models.CharField(
        max_length=20,
        choices=GARANTIA_ESTADOS,
        null=True,
        blank=True,
    )
    
    # ========== VINCULACIÓN CON CAJA ==========
    caja = models.ForeignKey(
        'caja.Caja',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pagos",
        help_text="Caja en la que se registró este pago"
    )

    class Meta:
        ordering = ["-fecha_pago", "-id_pago"]
        verbose_name = "Pago"
        verbose_name_plural = "Pagos"

    def __str__(self):
        if self.pedido_id:
            origen = f"PED-{self.pedido_id}"
        elif self.alquiler_id:
            origen = f"ALQ-{self.alquiler_id}"
        else:
            origen = "Extraordinario"

        return f"Pago #{self.id_pago} {self.get_tipo_pago_display()} ${self.monto} ({origen})"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # 1. Validar origen (pedido/alquiler) solo para tipos específicos
        tipos_con_origen = [
            "SENIA", "SALDO", "GARANTIA", 
            "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA"
        ]
        
        if self.tipo_pago in tipos_con_origen:
            if not self.pedido and not self.alquiler:
                raise ValidationError(
                    f"El tipo '{self.get_tipo_pago_display()}' debe estar asociado a un Pedido o Alquiler."
                )
            if self.pedido and self.alquiler:
                raise ValidationError(
                    "No se puede asociar el mismo pago a un Pedido y un Alquiler."
                )
        
        # 2. Validar que SENIA solo se use con pedidos
        if self.tipo_pago == "SENIA" and not self.pedido:
            raise ValidationError("Las señas deben estar asociadas a un Pedido.")
        
        # 3. Validar que garantías solo se usen con alquileres
        tipos_garantia = ["GARANTIA", "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA"]
        if self.tipo_pago in tipos_garantia and not self.alquiler:
            raise ValidationError(
                f"El tipo '{self.get_tipo_pago_display()}' debe estar asociado a un Alquiler."
            )
        
        # 4. Asignar estado de garantía automático
        if self.tipo_pago == "GARANTIA":
            self.estado_garantia = self.estado_garantia or "PENDIENTE"
        elif self.tipo_pago == "DEVOLUCION_GARANTIA":
            self.estado_garantia = "DEVUELTA"
        elif self.tipo_pago == "APLICACION_GARANTIA":
            self.estado_garantia = "APLICADA"
        else:
            self.estado_garantia = None
        
        # 5. Asignar sentido automático según tipo
        TIPOS_INGRESO = {
            "SENIA", "SALDO", "GARANTIA", "DEVOLUCION_TARDIA", "OTRO_INGRESO"
        }
        TIPOS_EGRESO = {
            "DEVOLUCION_GARANTIA", "APLICACION_GARANTIA", "OTRO_EGRESO"
        }
        
        if self.tipo_pago in TIPOS_INGRESO:
            self.sentido = "INGRESO"
        elif self.tipo_pago in TIPOS_EGRESO:
            self.sentido = "EGRESO"
    
    def save(self, *args, **kwargs):
        """Guarda el pago, infiriendo cliente y asignando a caja abierta"""
        # Ejecutar validaciones
        self.full_clean()
        
        # Inferir cliente si no está definido
        if not self.cliente:
            if self.pedido:
                self.cliente = getattr(self.pedido, 'cliente', None) or getattr(self.pedido, 'cliente_fk', None)
            elif self.alquiler:
                self.cliente = getattr(self.alquiler, 'cliente_fk', None) or getattr(self.alquiler, 'cliente', None)
        
        # Asignar a caja abierta si no está definida
        if not self.caja_id:
            from caja.models import Caja
            caja_abierta = Caja.objects.filter(estado='ABIERTA').first()
            if caja_abierta:
                self.caja = caja_abierta
        
        super().save(*args, **kwargs)
