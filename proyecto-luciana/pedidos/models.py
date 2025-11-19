from django.db import models
from decimal import Decimal
from datetime import timedelta, datetime, timezone
from clientes.models import Cliente
from productos.models import Producto

class Pedido(models.Model):
    # ------------------- Pedido / estados -------------------
    ESTADOS = (
        ('pendiente', 'pendiente'),
        ('confirmado', 'confirmado'),
        ('cancelado', 'cancelado'),
        ('entregado', 'entregado'),
    )

    # 👉 Tipo de entrega
    TIPO_ENTREGA = (
        ('retiro', 'Retira en el local'),
        ('envio', 'Envío a domicilio'),
    )

    # ❌ zona_entrega eliminado

    # Costo del flete (el admin lo escribirá a mano)
    costo_flete = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='pedidos'
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='pendiente'
    )

    fecha_hora_evento = models.DateTimeField(null=True, blank=True)
    fecha_hora_devolucion = models.DateTimeField(null=True, blank=True)

    # 👉 CAMPOS DE ENTREGA
    tipo_entrega = models.CharField(
        max_length=20,
        choices=TIPO_ENTREGA,
        default='retiro',
        help_text="Si el cliente retira o se entrega a domicilio"
    )
    direccion_evento = models.CharField(
        max_length=255,
        blank=True,
        help_text="Dirección donde se hace el evento / entrega"
    )
    referencia_entrega = models.CharField(
        max_length=255,
        blank=True,
        help_text="Referencia adicional para la entrega (piso, depto, etc.)"
    )

    # ------------------- Montos base -------------------
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    senia = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    forma_pago = models.CharField(max_length=40, blank=True)

    # ------------------- Comprobante de SEÑA -------------------
    comprobante_url = models.URLField(blank=True)
    comprobante_file = models.ImageField(
        upload_to='comprobantes/senia/',
        null=True,
        blank=True
    )

    # ------------------- Ítems -------------------
    productos = models.ManyToManyField(
        Producto,
        through='DetPedido',
        related_name='pedidos',
        blank=True
    )

    # ------------------- GARANTÍA -------------------
    garantia_monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    garantia_tipo = models.CharField(
        max_length=20,
        choices=(
            ('dni', 'dni'),
            ('servicio', 'servicio'),
            ('otro', 'otro')
        ),
        default='dni'
    )
    garantia_estado = models.CharField(
        max_length=20,
        choices=(
            ('pendiente', 'pendiente'),
            ('devuelta', 'devuelta'),
            ('descontada', 'descontada')
        ),
        default='pendiente'
    )

    garantia_dni_url = models.URLField(blank=True)
    garantia_dni_file = models.ImageField(
        upload_to='comprobantes/garantia/dni/',
        null=True,
        blank=True
    )
    garantia_serv_url = models.URLField(blank=True)
    garantia_serv_file = models.ImageField(
        upload_to='comprobantes/garantia/servicio/',
        null=True,
        blank=True
    )
    garantia_otro_url = models.URLField(blank=True)
    garantia_otro_file = models.ImageField(
        upload_to='comprobantes/garantia/otro/',
        null=True,
        blank=True
    )

    garantia_descuento = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    garantia_motivo = models.CharField(max_length=255, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    # ------------------- Propiedades útiles -------------------
    @property
    def total_cargos(self):
        return Decimal('0')

    @property
    def total_pagos(self):
        return Decimal('0')

    @property
    def saldo(self):
        return max(
            self.total + self.total_cargos - (self.senia + self.total_pagos),
            Decimal('0')
        )

    @property
    def garantia_comprobante_provisto(self) -> bool:
        return any([
            self.garantia_dni_url, self.garantia_dni_file,
            self.garantia_serv_url, self.garantia_serv_file,
            self.garantia_otro_url, self.garantia_otro_file,
        ])

    def can_delete(self) -> bool:
        return self.estado in ('entregado', 'cancelado')

    def can_edit(self) -> bool:
        if not self.fecha_hora_evento:
            return True
        now = datetime.now(timezone.utc) if self.fecha_hora_evento.tzinfo else datetime.utcnow()
        return (self.fecha_hora_evento - now) >= timedelta(hours=72)

    def __str__(self):
        return f"Pedido #{self.pk} — {self.cliente}"

    # ❌ función calcular_costo_flete eliminada

    def calcular_garantia(self):
        if self.garantia_monto == 0:
            self.garantia_monto = self.total * Decimal('0.15')
        self.save()


class DetPedido(models.Model):
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField()
    precio_unit = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unit

    def __str__(self):
        return f"DetPedido #{self.pk} ({self.producto}) x{self.cantidad}"
