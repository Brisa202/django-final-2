# alquileres/services.py
from decimal import Decimal
from django.db.models import Sum
from pagos.models import Pago
from .models import Alquiler, Cargo  # Cargo es tu modelo de cargos/daños

def liquidar_garantia(alquiler: Alquiler):
    """
    Calcula qué hacer con la garantía al cerrar un alquiler:
      - Suma garantía cobrada (Pagos tipo GARANTIA).
      - Suma cargos por daños (Cargo.monto).
      - Si no hay daños -> devolución total.
      - Si daños < garantía -> devolución parcial.
      - Si daños >= garantía -> se consume toda (no se devuelve nada).
    Crea los Pagos necesarios y actualiza alquiler.garantia_estado.
    """

    # 1) Total garantía cobrada para este alquiler
    garantia_cobrada = (
        Pago.objects.filter(alquiler=alquiler, tipo_pago="GARANTIA")
        .aggregate(total=Sum("monto"))["total"]
        or Decimal("0")
    )

    # 2) Total cargos por daños asociados al pedido de este alquiler
    total_cargos = Decimal("0")
    if alquiler.pedido_id:
        total_cargos = (
            Cargo.objects.filter(pedido_id=alquiler.pedido_id)
            .aggregate(total=Sum("monto"))["total"]
            or Decimal("0")
        )

    # Si no había garantía cobrada, nada que hacer
    if garantia_cobrada <= 0:
        alquiler.garantia_estado = "devuelta"
        alquiler.save(update_fields=["garantia_estado"])
        return

    # Si no hay daños -> devolución total
    if total_cargos <= 0:
        Pago.objects.create(
            alquiler=alquiler,
            cliente=alquiler.cliente_fk,
            tipo_pago="DEVOLUCION_GARANTIA",
            monto=garantia_cobrada,
            metodo_pago="EFECTIVO",  # o el mismo método del cobro original si querés
            notas="Devolución total de garantía",
        )
        alquiler.garantia_estado = "devuelta"
        alquiler.save(update_fields=["garantia_estado"])
        return

    # Si daños >= garantía -> se consume toda la garantía
    if total_cargos >= garantia_cobrada:
        # No devolvés nada. Marcás que fue descontada.
        alquiler.garantia_estado = "descontada"
        alquiler.save(update_fields=["garantia_estado"])
        return

    # Si daños < garantía -> parte a daños, parte se devuelve
    a_devolver = garantia_cobrada - total_cargos

    Pago.objects.create(
        alquiler=alquiler,
        cliente=alquiler.cliente_fk,
        tipo_pago="DEVOLUCION_GARANTIA",
        monto=a_devolver,
        metodo_pago="EFECTIVO",
        notas="Devolución parcial de garantía",
    )

    alquiler.garantia_estado = "descontada"
    alquiler.save(update_fields=["garantia_estado"])
