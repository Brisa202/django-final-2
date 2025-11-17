from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q

class Producto(models.Model):
    CATEGORIAS = (
        ('vajilla', 'Vajilla'),
        ('cristaleria', 'Cristalería'),
        ('manteleria', 'Mantelería'),
        ('decoracion', 'Decoración'),
        ('salon', 'Salón'),
        ('mobiliario', 'Mobiliario'),
    )

    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    precio = models.DecimalField(max_digits=10, decimal_places=2)

    # Stock y reservas
    stock = models.PositiveIntegerField(default=0)
    stock_reservado = models.PositiveIntegerField(default=0)   # 👈 ya lo tenías

    imagen_url = models.URLField(blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ---------- Validaciones y reglas ----------
    def clean(self):
        # No dejar números negativos ni reservado > stock
        if self.stock < 0 or self.stock_reservado < 0:
            raise ValidationError("Stock y stock reservado no pueden ser negativos.")
        if self.stock_reservado > self.stock:
            # Puede pasar transitoriamente si movés primero reservado y luego stock.
            # Mantenemos esta validación como protección básica.
            raise ValidationError("El stock reservado no puede superar al stock.")

    def delete(self, *args, **kwargs):
        # Bloquear borrado si hay incidentes abiertos
        from incidentes.models import Incidente  # import diferido
        abiertos = Incidente.objects.filter(
            det_alquiler__producto=self,
            estado_incidente='abierto'
        ).exists()
        if abiertos:
            raise ValidationError(
                "No se puede borrar el producto: existen incidentes abiertos asociados."
            )
        return super().delete(*args, **kwargs)

    @property
    def stock_disponible(self):
        return max(self.stock - self.stock_reservado, 0)

    # ---------- Helpers de stock (uso en servicios) ----------
    def reservar(self, cantidad: int):
        """Reserva unidades para un pedido (no toca stock real)."""
        if cantidad <= 0:
            raise ValidationError("Cantidad a reservar inválida.")
        if cantidad > self.stock_disponible:
            raise ValidationError(f"Sin stock disponible para reservar {cantidad} de {self.nombre}.")
        self.stock_reservado = self.stock_reservado + cantidad
        self.save(update_fields=["stock_reservado"])

    def liberar_reserva(self, cantidad: int):
        """Libera reserva (p. ej., al cancelar/rechazar un pedido)."""
        if cantidad <= 0:
            raise ValidationError("Cantidad a liberar inválida.")
        self.stock_reservado = max(0, self.stock_reservado - cantidad)
        self.save(update_fields=["stock_reservado"])

    def consumir_desde_reserva(self, cantidad: int):
        """
        Al entregar un alquiler: pasa de reservado a stock real (sale del depósito).
        """
        if cantidad <= 0:
            raise ValidationError("Cantidad a consumir inválida.")
        if cantidad > self.stock_reservado:
            raise ValidationError("No hay reserva suficiente para consumir.")
        if cantidad > self.stock:
            raise ValidationError("Stock insuficiente para entregar.")
        self.stock = self.stock - cantidad
        self.stock_reservado = self.stock_reservado - cantidad
        self.save(update_fields=["stock", "stock_reservado"])

    def devolver_a_stock(self, cantidad: int):
        """Suma unidades devueltas sanas al stock."""
        if cantidad <= 0:
            raise ValidationError("Cantidad a devolver inválida.")
        self.stock = self.stock + cantidad
        self.save(update_fields=["stock"])

    # ---------- Disponibilidad por rango de fechas ----------
    def reservado_en_rango(self, inicio, fin):
        """
        Suma de unidades reservadas (por pedidos) que SE SOLAPAN con [inicio, fin).
        Cuenta pedidos en estados 'pendiente' o 'confirmado'.
        """
        from pedidos.models import DetPedido, Pedido  # import diferido
        qs = (DetPedido.objects
              .filter(producto=self)
              .filter(pedido__estado__in=['pendiente', 'confirmado'])
              # solapamiento: no (devolucion <= inicio o evento >= fin)
              .filter(~Q(pedido__fecha_hora_devolucion__lte=inicio),
                      ~Q(pedido__fecha_hora_evento__gte=fin)))
        agg = qs.aggregate(total=Sum("cantidad"))
        return int(agg["total"] or 0)

    def disponible_en_rango(self, inicio, fin):
        """
        Disponibilidad teórica para un nuevo pedido en [inicio, fin):
        stock actual - reservas en ese rango (según pedidos existentes).
        """
        return max(self.stock - self.reservado_en_rango(inicio, fin), 0)

    class Meta:
        ordering = ["nombre", "id"]

    def __str__(self):
        return self.nombre

