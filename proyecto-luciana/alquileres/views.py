# alquileres/views.py
from decimal import Decimal
from rest_framework.viewsets import ModelViewSet

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.db.models import Count

from .models import Alquiler, DetAlquiler
from .serializers import (
    AlquilerSerializer,
    DetAlquilerSerializer,
    AlquilerGarantiaUpdateSerializer,
    CobroGarantiaSerializer,
)
from pedidos.services import entregar_alquiler
from pedidos.models import Pedido
from incidentes.models import Incidente
from pagos.models import Pago


class AlquilerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AlquilerSerializer

    def get_queryset(self):
        qs = (
            Alquiler.objects
            .annotate(items_count=Count('items'))
            .prefetch_related('items__producto')
            .select_related('cliente_fk', 'pedido')
            .order_by('-creado_en')
        )
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        hay_abiertos = Incidente.objects.filter(
            det_alquiler__alquiler=instance,
            estado_incidente='abierto'
        ).exists()
        if hay_abiertos:
            return Response(
                {"detail": "No puede borrarse: existen incidentes abiertos."},
                status=status.HTTP_409_CONFLICT
            )
        return super().destroy(request, *args, **kwargs)

    # === NUEVO: Endpoint para obtener resumen del alquiler ===
    @action(detail=True, methods=['get'], url_path='resumen')
    def resumen(self, request, pk=None):
        """Obtiene un resumen completo del alquiler"""
        alq = self.get_object()
        
        # Calcular totales
        total_alquiler = Decimal('0')
        for item in alq.items.all():
            total_alquiler += Decimal(str(item.cantidad)) * Decimal(str(item.precio_unit))
        
        # Calcular costo de incidentes
        incidentes = Incidente.objects.filter(
            det_alquiler__alquiler=alq,
            estado_incidente='resuelto',
            resultado_final='repuesto',
        ).select_related('det_alquiler')
        
        costo_incidentes = Decimal('0')
        for inc in incidentes:
            qty = Decimal(str(inc.cantidad_repuesta or inc.cantidad_afectada or 0))
            det = inc.det_alquiler
            precio = Decimal(str(
                getattr(det, 'precio_unit', getattr(det, 'precio_unitario', 0)) or 0
            ))
            costo_incidentes += qty * precio
        
        # Obtener garantía
        garantia = Decimal(str(alq.garantia_monto_cobrado or 0))
        if not garantia and alq.pedido:
            garantia = Decimal(str(getattr(alq.pedido, 'garantia_monto', 0) or 0))
        
        # Datos del pedido si existe
        senia = Decimal('0')
        forma_pago = ""
        if alq.pedido:
            senia = Decimal(str(getattr(alq.pedido, 'senia', 0) or 0))
            forma_pago = getattr(alq.pedido, 'forma_pago', '') or ""
        
        # Calcular saldo pendiente
        saldo_pendiente = total_alquiler - senia
        
        # Verificar incidentes abiertos
        incidentes_abiertos = Incidente.objects.filter(
            det_alquiler__alquiler=alq,
            estado_incidente='abierto'
        ).count()
        
        # Puede finalizar si no está entregado/finalizado y no hay incidentes abiertos
        puede_finalizar = (
            alq.estado in ['pendiente', 'confirmado'] 
            and incidentes_abiertos == 0
        )
        
        return Response({
            'alquiler_id': alq.id,
            'cliente': alq.cliente or (alq.cliente_fk.nombre if alq.cliente_fk else "Sin cliente"),
            'estado': alq.estado,
            'garantia_estado': alq.garantia_estado,
            'totales': {
                'total_alquiler': float(total_alquiler),
                'senia_pagada': float(senia),
                'saldo_pendiente': float(saldo_pendiente),
                'garantia_cobrada': float(garantia),
                'costo_incidentes': float(costo_incidentes),
            },
            'forma_pago': forma_pago,
            'incidentes_abiertos': incidentes_abiertos,
            'puede_finalizar': puede_finalizar,
        })

    # === Actualizar garantía manualmente ===
    @action(detail=True, methods=['post'], url_path='actualizar_garantia')
    def actualizar_garantia(self, request, pk=None):
        """
        Recibe: { "garantia_estado": "pendiente|devuelta|aplicada" }
        Aplica directo sobre el Pedido vinculado.
        """
        alq = self.get_object()
        if not alq.pedido_id:
            return Response(
                {'detail': 'Este alquiler no está vinculado a un pedido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ser = AlquilerGarantiaUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        nuevo_estado = ser.validated_data['garantia_estado']

        # Actualizar pedido y alquiler
        Pedido.objects.filter(pk=alq.pedido_id).update(garantia_estado=nuevo_estado)
        alq.garantia_estado = nuevo_estado
        alq.save(update_fields=['garantia_estado'])
        
        return Response(
            {'detail': f'Garantía actualizada a "{nuevo_estado}".'},
            status=status.HTTP_200_OK
        )

    # === Calcular total de incidentes con costo (solo informativo) ===
    @action(detail=True, methods=['get'], url_path='total_incidentes')
    def total_incidentes(self, request, pk=None):
        """
        Suma el costo de incidentes con resultado_final='repuesto'.
        (Solo informativo, no se guarda).
        """
        alq = self.get_object()
        incs = (
            Incidente.objects
            .filter(
                det_alquiler__alquiler=alq,
                estado_incidente='resuelto',
                resultado_final='repuesto',
            )
            .select_related('det_alquiler')
        )

        total = Decimal('0')
        for inc in incs:
            qty = Decimal(str(inc.cantidad_repuesta or inc.cantidad_afectada or 0))
            det = inc.det_alquiler
            pu = Decimal(str(
                getattr(det, 'precio_unit', getattr(det, 'precio_unitario', 0)) or 0
            ))
            total += qty * pu

        return Response(
            {'total_incidentes': float(total)},
            status=status.HTTP_200_OK
        )

    # === Finalizar alquiler: resuelve garantía + genera pagos ===
    @action(detail=True, methods=['post'], url_path='finalizar')
    def finalizar(self, request, pk=None):
        """
        Finaliza el alquiler y define qué pasa con la garantía.

        Regla:
        - Si hay incidentes ABIERTOS -> garantía 'pendiente', sin movimientos.
        - Si no hay garantía configurada:
            - con costos -> 'aplicada'
            - sin costos -> 'devuelta'
        - Si hay garantía (pedido.garantia_monto):
            * costo_incidentes = 0:
                - Devolver 100% -> crea Pago DEVOLUCION_GARANTIA (EGRESO)
            * 0 < costo < garantia:
                - Aplicar costo -> Pago APLICACION_GARANTIA (INGRESO, contable)
                - Devolver diferencia -> Pago DEVOLUCION_GARANTIA (EGRESO)
            * costo >= garantia:
                - Se aplica toda -> Pago APLICACION_GARANTIA (INGRESO)
                - No hay devolución
        """
        alq = self.get_object()

        if not alq.pedido_id:
            return Response(
                {'detail': 'Este alquiler no está vinculado a un pedido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ped = alq.pedido

        # ¿Hay incidentes abiertos?
        if Incidente.objects.filter(
            det_alquiler__alquiler=alq,
            estado_incidente='abierto'
        ).exists():
            ped.garantia_estado = 'pendiente'
            ped.save(update_fields=['garantia_estado'])
            
            alq.garantia_estado = 'pendiente'
            if alq.estado != 'entregado':
                alq.estado = 'entregado'
            alq.save(update_fields=['estado', 'garantia_estado'])

            return Response(
                {
                    'detail': 'Hay incidentes abiertos; garantía queda pendiente.',
                    'garantia_estado': 'pendiente'
                },
                status=status.HTTP_200_OK
            )

        # ------- calcular costos de incidentes resueltos -------
        incs_resueltos = (
            Incidente.objects
            .filter(
                det_alquiler__alquiler=alq,
                estado_incidente='resuelto',
                resultado_final='repuesto',
            )
            .select_related('det_alquiler')
        )

        total_incidentes = Decimal('0')
        for inc in incs_resueltos:
            qty = Decimal(str(inc.cantidad_repuesta or inc.cantidad_afectada or 0))
            det = inc.det_alquiler
            pu = Decimal(str(
                getattr(det, 'precio_unit', getattr(det, 'precio_unitario', 0)) or 0
            ))
            total_incidentes += qty * pu

        garantia_total = Decimal(str(ped.garantia_monto or 0))
        aplicado = Decimal('0')
        devuelto = Decimal('0')

        # ------- lógica de garantía -------
        if garantia_total <= 0:
            # No había garantía registrada
            if total_incidentes > 0:
                ped.garantia_estado = 'aplicada'
                alq.garantia_estado = 'aplicada'
            else:
                ped.garantia_estado = 'devuelta'
                alq.garantia_estado = 'devuelta'
        else:
            if total_incidentes <= 0:
                # Sin daños -> devolvemos todo
                devuelto = garantia_total
                ped.garantia_estado = 'devuelta'
                alq.garantia_estado = 'devuelta'
            elif total_incidentes < garantia_total:
                # Parte a daños, parte se devuelve
                aplicado = total_incidentes
                devuelto = garantia_total - total_incidentes
                ped.garantia_estado = 'aplicada'
                alq.garantia_estado = 'aplicada'
            else:
                # Daños >= garantía -> se come todo
                aplicado = garantia_total
                devuelto = Decimal('0')
                ped.garantia_estado = 'aplicada'
                alq.garantia_estado = 'aplicada'

        ped.save(update_fields=['garantia_estado'])

        # ------- generar pagos automáticos -------
        cliente = ped.cliente if getattr(ped, "cliente_id", None) else None

        # Aplicación de garantía (solo si hubo algo aplicado)
        if aplicado > 0:
            Pago.objects.create(
                pedido=ped,
                alquiler=alq,
                cliente=cliente,
                tipo_pago="APLICACION_GARANTIA",
                sentido="INGRESO",
                monto=aplicado,
                metodo_pago="EFECTIVO",
                notas=f"Garantía aplicada a incidentes en alquiler #{alq.id}",
                estado_garantia="APLICADA",
            )

        # Devolución de garantía (egreso)
        if devuelto > 0:
            Pago.objects.create(
                pedido=ped,
                alquiler=alq,
                cliente=cliente,
                tipo_pago="DEVOLUCION_GARANTIA",
                sentido="EGRESO",
                monto=devuelto,
                metodo_pago="EFECTIVO",
                notas=f"Devolución de garantía alquiler #{alq.id}",
                estado_garantia="DEVUELTA",
            )

        # ------- marcar alquiler finalizado -------
        alq.estado = 'finalizado'
        if hasattr(alq, 'finalizado_en'):
            from django.utils import timezone
            alq.finalizado_en = timezone.now()
        alq.save(update_fields=['estado', 'garantia_estado', 'finalizado_en'] if hasattr(alq, 'finalizado_en') else ['estado', 'garantia_estado'])

        return Response(
            {
                'detail': 'Alquiler finalizado y garantía resuelta.',
                'garantia_total': float(garantia_total),
                'total_incidentes': float(total_incidentes),
                'aplicado_a_incidentes': float(aplicado),
                'devuelto_al_cliente': float(devuelto),
                'garantia_estado': ped.garantia_estado,
            },
            status=status.HTTP_200_OK
        )


class DetAlquilerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DetAlquilerSerializer

    def get_queryset(self):
        qs = DetAlquiler.objects.select_related('alquiler', 'producto')
        alq = self.request.query_params.get('alquiler')
        if alq:
            qs = qs.filter(alquiler_id=alq)
        return qs


class AlquilerEntregarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        alq = entregar_alquiler(pk)
        return Response(AlquilerSerializer(alq).data, status=status.HTTP_200_OK)
