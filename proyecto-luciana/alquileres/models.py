from django.db import models
from django.utils import timezone

from clientes.models import Cliente
from productos.models import Producto
from pedidos.models import Pedido


class Alquiler(models.Model):
    ESTADOS = (
        ('pendiente',  'Pendiente'),
        ('confirmado', 'Confirmado'),
        ('entregado',  'Entregado'),
        ('finalizado', 'Finalizado'),
        ('cancelado',  'Cancelado'),
    )

    # ====== Enlaces (Relaciones) ======
    pedido = models.OneToOneField(
        Pedido,
        on_delete=models.CASCADE,
        related_name='alquiler',
        null=True,
        blank=True,
        help_text="Pedido que generó este alquiler"
    )
    cliente_fk = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='alquileres',
        help_text="Cliente del alquiler"
    )

    # Info legible
    cliente   = models.CharField(max_length=200, blank=True)
    estado    = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    creado_en = models.DateTimeField(auto_now_add=True)
    finalizado_en = models.DateTimeField(null=True, blank=True)

    # ====== Gestión de garantía simplificada ======
    GARANTIA_ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('devuelta',  'Devuelta'),
        ('aplicada',  'Aplicada'),
    )

    garantia_estado = models.CharField(
        max_length=20,
        choices=GARANTIA_ESTADOS,
        default='pendiente'
    )
    
    # Campo unificado para monto de garantía
    garantia_monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monto de garantía cobrado (se copia desde pedido.garantia_monto)"
    )
    
    # Campos legacy (mantener por compatibilidad)
    garantia_monto_cobrado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="[DEPRECADO] Usar garantia_monto"
    )
    garantia_metodo = models.CharField(
        max_length=20,
        choices=(
            ('efectivo', 'Efectivo'),
            ('transferencia', 'Transferencia'),
            ('tarjeta', 'Tarjeta'),
        ),
        blank=True
    )
    garantia_nota = models.CharField(max_length=255, blank=True)
    garantia_fecha_cobro = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-creado_en', 'id']

    def __str__(self):
        return f'Alquiler #{self.pk} - {self.cliente or "Sin cliente"}'

    def save(self, *args, **kwargs):
        """Al guardar, sincroniza garantia_monto con garantia_monto_cobrado"""
        # Sincronizar campos legacy
        if self.garantia_monto and not self.garantia_monto_cobrado:
            self.garantia_monto_cobrado = self.garantia_monto
        elif self.garantia_monto_cobrado and not self.garantia_monto:
            self.garantia_monto = self.garantia_monto_cobrado
        
        super().save(*args, **kwargs)

    @property
    def puede_finalizar(self):
        """Verifica si el alquiler puede ser finalizado"""
        return self.estado in ['pendiente', 'confirmado', 'entregado']

    @property
    def tiene_incidentes_abiertos(self):
        """Verifica si hay incidentes sin resolver"""
        from incidentes.models import Incidente
        return Incidente.objects.filter(
            det_alquiler__alquiler=self,
            estado_incidente='abierto'
        ).exists()

    def calcular_total(self):
        """Calcula el total del alquiler sumando todos los items"""
        from decimal import Decimal
        total = Decimal('0')
        for item in self.items.all():
            total += Decimal(str(item.cantidad)) * Decimal(str(item.precio_unit))
        return total

    def calcular_costo_incidentes(self):
        """Calcula el costo total de incidentes resueltos con repuesto"""
        from decimal import Decimal
        from incidentes.models import Incidente
        
        incidentes = Incidente.objects.filter(
            det_alquiler__alquiler=self,
            estado_incidente='resuelto',
            resultado_final='repuesto',
        ).select_related('det_alquiler')
        
        total = Decimal('0')
        for inc in incidentes:
            qty = Decimal(str(inc.cantidad_repuesta or inc.cantidad_afectada or 0))
            precio = Decimal(str(inc.det_alquiler.precio_unit or 0))
            total += qty * precio
        
        return total

    # ===== Helpers ligados al modelo pagos.Pago (mantener compatibilidad) =====

    def registrar_pago(
        self,
        monto,
        tipo_pago="SALDO",
        metodo="EFECTIVO",
        comprobante="",
        notas=""
    ):
        """
        Crea un Pago (app pagos) asociado a este alquiler.
        """
        from pagos.models import Pago

        metodo_norm = metodo.upper()

        pago = Pago.objects.create(
            alquiler=self,
            pedido=self.pedido if self.pedido_id else None,
            cliente=self.cliente_fk,
            monto=monto,
            tipo_pago=tipo_pago,
            metodo_pago=metodo_norm,
            comprobante_pago=comprobante or "",
            notas=notas or "",
        )
        return pago

    def registrar_pago_garantia(
        self,
        monto,
        metodo="EFECTIVO",
        comprobante="",
        notas=""
    ):
        """
        Atajo específico para registrar un pago de GARANTÍA
        vinculado al alquiler.
        """
        from pagos.models import Pago

        metodo_norm = metodo.upper()

        pago = Pago.objects.create(
            alquiler=self,
            pedido=self.pedido if self.pedido_id else None,
            cliente=self.cliente_fk,
            monto=monto,
            tipo_pago="GARANTIA",
            metodo_pago=metodo_norm,
            comprobante_pago=comprobante or "",
            notas=notas or "Garantía de alquiler",
            estado_garantia="PENDIENTE",
        )

        # Reflejar en campos del alquiler
        self.garantia_estado = 'pendiente'
        self.garantia_monto = monto
        self.garantia_monto_cobrado = monto
        self.garantia_metodo = metodo.lower()
        self.garantia_nota = notas or "Garantía registrada"
        self.garantia_fecha_cobro = timezone.now()
        self.save(update_fields=[
            'garantia_estado',
            'garantia_monto',
            'garantia_monto_cobrado',
            'garantia_metodo',
            'garantia_nota',
            'garantia_fecha_cobro',
        ])

        return pago

    def marcar_garantia_aplicada(self, monto, metodo='efectivo', nota=''):
        """
        [NUEVO] Marca la garantía como aplicada a daños.
        Reemplaza marcar_garantia_descontada con nombre más claro.
        """
        self.garantia_estado = 'aplicada'
        self.garantia_metodo = metodo
        self.garantia_nota = nota or 'Garantía aplicada a daños'
        self.save(update_fields=[
            'garantia_estado',
            'garantia_metodo',
            'garantia_nota',
        ])

        if self.pedido_id:
            Pedido.objects.filter(pk=self.pedido_id).update(
                garantia_estado='aplicada'
            )

    def marcar_garantia_descontada(self, monto, metodo, nota=''):
        """
        [DEPRECADO] Mantener por compatibilidad.
        Usa marcar_garantia_aplicada() en su lugar.
        """
        # Redirigir al nuevo método
        self.marcar_garantia_aplicada(monto, metodo, nota)


class DetAlquiler(models.Model):
    alquiler    = models.ForeignKey(Alquiler, on_delete=models.CASCADE, related_name='items')
    producto    = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad    = models.PositiveIntegerField()
    precio_unit = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'#{self.pk} · {self.producto} x{self.cantidad}'

    @property
    def subtotal(self):
        from decimal import Decimal
        return Decimal(str(self.cantidad)) * Decimal(str(self.precio_unit))


class Cargo(models.Model):
    """Cargos adicionales al pedido (incidentes, demoras, etc.)"""
    ORIGENES = (
        ('incidente', 'Incidente'),
        ('demora', 'Demora en devolución'),
        ('otro', 'Otro')
    )

    pedido = models.ForeignKey(Pedido, on_delete=models.PROTECT, related_name='cargos')
    origen = models.CharField(max_length=20, choices=ORIGENES, default='incidente')
    descripcion = models.CharField(max_length=255, blank=True)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f"Cargo #{self.pk} ${self.monto} - {self.get_origen_display()}"