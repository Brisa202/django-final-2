# incidentes/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from incidentes.models import Incidente
from pedidos.models import Pedido

def _recalcular_garantia_por_alquiler(alquiler):
    """
    Regla:
    - Si hay incidentes abiertos => garantía 'pendiente'
    - Si no hay abiertos y hay incidentes con costo (repuesto/descontado) => 'descontada'
    - Si no hay costo => 'devuelta'
    """
    if not alquiler or not alquiler.pedido_id:
        return

    qs = Incidente.objects.filter(det_alquiler__alquiler=alquiler)
    hay_abiertos = qs.filter(estado_incidente='abierto').exists()
    hay_con_costo = qs.filter(resultado_final__in=['repuesto', 'descontado']).exists()  # 👈 corregido

    if hay_abiertos:
        nuevo_estado = 'pendiente'
    elif hay_con_costo:
        nuevo_estado = 'descontada'
    else:
        nuevo_estado = 'devuelta'

    Pedido.objects.filter(pk=alquiler.pedido_id).update(garantia_estado=nuevo_estado)

@receiver(post_save, sender=Incidente)
def incidente_guardado(sender, instance, created, **kwargs):
    det = getattr(instance, 'det_alquiler', None)
    alq = getattr(det, 'alquiler', None)
    _recalcular_garantia_por_alquiler(alq)

@receiver(post_delete, sender=Incidente)
def incidente_borrado(sender, instance, **kwargs):
    det = getattr(instance, 'det_alquiler', None)
    alq = getattr(det, 'alquiler', None)
    _recalcular_garantia_por_alquiler(alq)

