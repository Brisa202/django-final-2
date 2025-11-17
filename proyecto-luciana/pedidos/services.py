# pedidos/services.py
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal

from clientes.models import Cliente
from productos.models import Producto
from pedidos.models import Pedido, DetPedido
from alquileres.models import Alquiler, DetAlquiler


@transaction.atomic
def crear_pedido_y_alquiler(
    *,
    cliente_id,
    items,
    fecha_hora_evento,
    fecha_hora_devolucion,
    senia=Decimal("0"),
    forma_pago=None,
    comprobante_url=None,
    comprobante_file=None,
):
    """
    Crea Pedido + Detalles, reserva stock, calcula total
    y genera el Alquiler espejo con sus ítems.
    """
    if fecha_hora_devolucion <= fecha_hora_evento:
        raise ValidationError("La devolución debe ser posterior al evento.")

    cliente = Cliente.objects.get(pk=cliente_id)
    productos = Producto.objects.in_bulk([it["producto_id"] for it in items])

    # Validar disponibilidad rápida (stock_disponible actual)
    for it in items:
        p = productos.get(it["producto_id"])
        if not p:
            raise ValidationError("Producto inexistente.")
        if it["cantidad"] <= 0:
            raise ValidationError("Cantidad inválida.")
        if it["cantidad"] > p.stock_disponible:
            raise ValidationError(
                f"Sin stock disponible para {p.nombre}. Disponible: {p.stock_disponible}"
            )

    # Crear Pedido
    pedido = Pedido(
        cliente=cliente,
        fecha_hora_evento=fecha_hora_evento,
        fecha_hora_devolucion=fecha_hora_devolucion,
        senia=senia or 0,
        forma_pago=forma_pago or "",
    )
    if comprobante_url:
        pedido.comprobante_url = comprobante_url
    if comprobante_file:
        pedido.comprobante_file = comprobante_file
    pedido.save()

    # 🔧 FIX: Usar precio_unit de los items, o p.precio como fallback
    total = Decimal("0")
    for it in items:
        p = productos[it["producto_id"]]
        
        # 👉 PRIORIZAR precio_unit del frontend, sino usar precio del producto
        precio_unitario = Decimal(str(it.get("precio_unit", p.precio)))
        
        DetPedido.objects.create(
            pedido=pedido, 
            producto=p, 
            cantidad=it["cantidad"], 
            precio_unit=precio_unitario  # 👈 USAR EL PRECIO CORRECTO
        )
        total += precio_unitario * it["cantidad"]
        p.reservar(it["cantidad"])  # ← mueve a stock_reservado

    pedido.total = total
    pedido.save(update_fields=["total"])

    # Crear Alquiler espejo
    alquiler = Alquiler.objects.create(
        pedido=pedido,
        cliente_fk=cliente,
        cliente=f"{cliente.nombre} {cliente.apellido}".strip(),
        estado="pendiente",
    )
    
    # 👉 Copiar items del pedido al alquiler con los precios correctos
    for det in pedido.detalles.select_related("producto"):
        DetAlquiler.objects.create(
            alquiler=alquiler,
            producto=det.producto,
            cantidad=det.cantidad,
            precio_unit=det.precio_unit,  # 👈 YA TIENE EL PRECIO CORRECTO
        )

    return pedido, alquiler


@transaction.atomic
def cancelar_pedido(pedido_id: int):
    """
    Marca el pedido como 'cancelado' y libera las reservas.
    Si existe alquiler espejo, lo marca 'cancelado'.
    """
    ped = Pedido.objects.get(pk=pedido_id)

    # Liberar reservas de stock
    for det in ped.detalles.select_related("producto"):
        det.producto.liberar_reserva(det.cantidad)

    # ✅ Estado coherente con el modelo y frontend
    ped.estado = "cancelado"
    ped.save(update_fields=["estado"])

    if hasattr(ped, "alquiler") and ped.alquiler:
        ped.alquiler.estado = "cancelado"
        ped.alquiler.save(update_fields=["estado"])

    return ped


@transaction.atomic
def entregar_alquiler(alquiler_id: int):
    """
    Marca el alquiler como ENTREGADO y mueve stock:
    por cada ítem, consume desde la reserva (sale del depósito).
    """
    alq = (
        Alquiler.objects.select_related("pedido")
        .prefetch_related("items__producto")
        .get(pk=alquiler_id)
    )

    for item in alq.items.all():
        item.producto.consumir_desde_reserva(item.cantidad)

    alq.estado = "entregado"
    alq.save(update_fields=["estado"])

    # (Opcional) actualizar estado del pedido si aplica
    if alq.pedido and alq.pedido.estado in ("pendiente", "confirmado"):
        alq.pedido.estado = "entregado"
        alq.pedido.save(update_fields=["estado"])

    return alq