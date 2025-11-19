# productos/views.py
from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Producto
from .permissions import SoloAdminEdita
from .serializers import (
    ProductoSerializer,
    ProductoDisponibilidadSerializer,
)


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all().order_by('nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated, SoloAdminEdita]

    # Habilitamos búsqueda por nombre con ?search=
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

    # ====== DELETE con manejo de errores a 409 ======
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ValidationError as e:
            msg = e.messages[0] if getattr(e, "messages", None) else str(e)
            return Response({"detail": msg}, status=status.HTTP_409_CONFLICT)
        except ProtectedError:
            return Response(
                {
                    "detail": "No se puede eliminar el producto porque está "
                              "referenciado por pedidos o alquileres."
                },
                status=status.HTTP_409_CONFLICT
            )
        except IntegrityError:
            return Response(
                {
                    "detail": "No se puede eliminar el producto porque tiene "
                              "movimientos asociados (pedidos/alquileres)."
                },
                status=status.HTTP_409_CONFLICT
            )

    # ====== Activar/Desactivar (no borrar) ======
    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        """
        Invierte el estado 'activo' del producto.
        PATCH /api/productos/<id>/toggle-activo/
        """
        producto = self.get_object()
        producto.activo = not producto.activo
        producto.save(update_fields=["activo"])
        return Response(
            {"id": producto.id, "activo": producto.activo},
            status=status.HTTP_200_OK
        )

    # ====== /api/productos/<pk>/reservas/ ======
    @action(detail=True, methods=['get'], url_path='reservas')
    def reservas(self, request, pk=None):
        """
        Devuelve el desglose de reservas del producto (pedidos y/o alquileres activos).
        Las fechas salen en ISO 8601. Orden: inicio DESC.
        """
        producto = self.get_object()
        out = []

        def _iso_and_ts(dt):
            # Acepta datetime o string; devuelve (iso_str, timestamp_num)
            if isinstance(dt, str):
                dt = parse_datetime(dt)
            if not dt:
                return None, 0
            if timezone.is_aware(dt):
                dt = timezone.make_naive(dt, timezone.get_current_timezone())
            try:
                ts = dt.timestamp()
            except Exception:
                ts = 0
            return dt.isoformat(), ts

        # ---------- PEDIDOS ----------
        Pedido = DetPedido = None
        try:
            Pedido = apps.get_model('pedidos', 'Pedido')
            DetPedido = apps.get_model('pedidos', 'DetPedido')
        except LookupError:
            Pedido = DetPedido = None

        if Pedido and DetPedido:
            activos = ('pendiente', 'confirmado')
            dets = (
                DetPedido.objects
                .select_related('pedido', 'producto', 'pedido__cliente')
                .filter(producto=producto, pedido__estado__in=activos)
            )
            for d in dets:
                p = d.pedido
                try:
                    nombre_cliente = (
                        getattr(p.cliente, 'nombre', None) or str(p.cliente)
                    )
                except Exception:
                    nombre_cliente = '—'

                ini_iso, ini_ts = _iso_and_ts(
                    getattr(p, 'fecha_hora_evento', None)
                )
                fin_iso, _ = _iso_and_ts(
                    getattr(p, 'fecha_hora_devolucion', None)
                )
                out.append({
                    "origen": "pedido",
                    "id_origen": p.id,
                    "cliente": nombre_cliente,
                    "cantidad": int(getattr(d, 'cantidad', 0) or 0),
                    "inicio": ini_iso,
                    "fin": fin_iso,
                    "estado": getattr(p, 'estado', None),
                    "_ts": ini_ts,  # solo para ordenar
                })

        # ---------- ALQUILERES ----------
        Alquiler = DetAlquiler = None
        try:
            Alquiler = apps.get_model('alquileres', 'Alquiler')
            DetAlquiler = apps.get_model('alquileres', 'DetAlquiler')
        except LookupError:
            Alquiler = DetAlquiler = None

        if Alquiler and DetAlquiler:
            activos = ('pendiente', 'confirmado')
            dets = (
                DetAlquiler.objects
                .select_related(
                    'alquiler',
                    'producto',
                    'alquiler__cliente_fk',
                    'alquiler__pedido'
                )
                .filter(
                    producto=producto,
                    alquiler__estado__in=activos,
                    alquiler__pedido__isnull=True  # no duplicar si viene de un Pedido
                )
            )
            for d in dets:
                a = d.alquiler
                if getattr(a, 'cliente_fk_id', None):
                    nombre_cliente = str(a.cliente_fk)
                else:
                    nombre_cliente = getattr(a, 'cliente', '') or '—'

                ini_iso, ini_ts = _iso_and_ts(
                    getattr(a, 'fecha_inicio', None)
                )
                fin_iso, _ = _iso_and_ts(
                    getattr(a, 'fecha_fin', None)
                )
                out.append({
                    "origen": "alquiler",
                    "id_origen": a.id,
                    "cliente": nombre_cliente,
                    "cantidad": int(getattr(d, 'cantidad', 0) or 0),
                    "inicio": ini_iso,
                    "fin": fin_iso,
                    "estado": getattr(a, 'estado', None),
                    "_ts": ini_ts,  # solo para ordenar
                })

        # Orden: inicio DESC por timestamp; luego limpiamos la clave interna
        out.sort(key=lambda r: r.get('_ts', 0), reverse=True)
        for r in out:
            r.pop('_ts', None)

        return Response(out, status=status.HTTP_200_OK)

    # ====== Disponibilidad por rango ======
    @action(detail=False, methods=['get'], url_path='disponibles')
    def disponibles(self, request):
        inicio = parse_datetime(request.query_params.get('inicio', ''))
        fin = parse_datetime(request.query_params.get('fin', ''))
        if not inicio or not fin or fin <= inicio:
            return Response(
                {"detail": "Parámetros inválidos. Enviá ?inicio=ISO&fin=ISO"},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = []
        for p in self.get_queryset().filter(activo=True):
            if hasattr(p, 'disponible_en_rango'):
                disponible = p.disponible_en_rango(inicio, fin)
            else:
                disponible = p.stock_disponible
            p.disponible = disponible
            data.append(p)

        ser = ProductoDisponibilidadSerializer(data, many=True)
        return Response(ser.data)

    # ====== List con filtro ?activo=true|false y soporte de ?inicio&fin ======
    def list(self, request, *args, **kwargs):
        """
        GET /api/productos/?activo=true|false (opcional)
        GET /api/productos/?inicio=ISO&fin=ISO -> delega a /disponibles (solo activos)
        + soporta ?search=... gracias a SearchFilter
        """
        # Si piden disponibilidad por rango, delegamos (manteniendo tu comportamiento)
        inicio = request.query_params.get('inicio')
        fin = request.query_params.get('fin')
        if inicio and fin:
            return self.disponibles(request)

        # Filtro por activo si viene en querystring
        activo_param = request.query_params.get('activo')
        qs = self.get_queryset()
        if activo_param is not None:
            val = activo_param.lower()
            if val in ('true', '1', 'yes', 'y'):
                qs = qs.filter(activo=True)
            elif val in ('false', '0', 'no', 'n'):
                qs = qs.filter(activo=False)
        self.queryset = qs

        return super().list(request, *args, **kwargs)
