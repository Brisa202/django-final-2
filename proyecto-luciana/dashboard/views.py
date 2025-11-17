# dashboard/views.py
from django.utils import timezone
from django.db.models import Sum, Q, Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from decimal import Decimal

from pedidos.models import Pedido
from alquileres.models import Alquiler, Cargo
from incidentes.models import Incidente
from pagos.models import Pago # Asegurado el import para todas las vistas que lo usan


class MetricsSummaryView(APIView):
    """Resumen de métricas principales del dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        year, month = now.year, now.month

        # 💰 Calcular Balance Total de Caja (INGRESOS - EGRESOS)
        
        ingresos_totales = Pago.objects.filter(
            sentido='INGRESO'
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
        
        egresos_totales = Pago.objects.filter(
            sentido='EGRESO'
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
        
        balance_total_caja = ingresos_totales - egresos_totales

        # 💰 Ingresos del mes (pedidos confirmados/entregados)
        ingresos_mes = Pedido.objects.filter(
            estado__in=["confirmado", "entregado"],
            fecha_hora_evento__year=year,
            fecha_hora_evento__month=month,
        ).aggregate(
            total=Sum("total")
        )["total"] or Decimal('0')

        # ⏳ Pedidos pendientes
        pedidos_pendientes = Pedido.objects.filter(estado="pendiente").count()

        # 📦 Alquileres totales (todos los registros)
        alquileres_total = Alquiler.objects.count()

        # ⚠️ Incidentes ABIERTOS
        incidentes_abiertos = Incidente.objects.filter(
            estado_incidente="abierto"
        ).count()

        return Response({
            "balance_total_caja": float(balance_total_caja),
            "ingresos_mes": float(ingresos_mes),
            "alquileres_total": alquileres_total,
            "pedidos_pendientes": pedidos_pendientes,
            "incidentes_abiertos": incidentes_abiertos,
        })


class RecentActivityView(APIView):
    """Actividad reciente del sistema"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = []

        # 🧾 Últimos 6 pedidos
        for p in Pedido.objects.select_related('cliente').order_by('-id')[:6]:
            tone = "ok" if p.estado in ("confirmado", "entregado") else \
                   "warning" if p.estado == "pendiente" else "info"

            dt = p.fecha_hora_evento or p.creado_en
            time_txt = timezone.localtime(dt).strftime("%d/%m %H:%M")

            items.append({
                "tone": tone,
                "title": f"Pedido {p.get_estado_display()}",
                "ref": f"#PO{p.id:05d}",
                "time": time_txt,
                "amount": f"${p.total:,.2f}",
                "badge": None,
                "ts": dt,
            })

        # ⚠️ Últimos 4 incidentes
        for inc in Incidente.objects.select_related(
            'det_alquiler__alquiler',
            'det_alquiler__producto'
        ).order_by('-id')[:4]:
            dt = inc.fecha_incidente
            estado_display = {
                'abierto': 'warning',
                'resuelto': 'ok',
                'anulado': 'info'
            }.get(inc.estado_incidente, 'info')

            items.append({
                "tone": estado_display,
                "title": f"Incidente {inc.get_estado_incidente_display()}",
                "ref": f"#INC{inc.id:04d}",
                "time": timezone.localtime(dt).strftime("%d/%m %H:%M"),
                "amount": None,
                "badge": inc.get_tipo_incidente_display()[:15] if inc.tipo_incidente else None,
                "ts": dt,
            })

        # Ordenar por fecha descendente y limitar a 10
        items.sort(key=lambda x: x["ts"], reverse=True)
        items = [{k: v for k, v in it.items() if k != "ts"} for it in items[:10]]

        return Response({"items": items})


class MetricsChartView(APIView):
    """
    Datos para gráfico de Ingresos vs Egresos
    Ingresos: suma de pedidos confirmados/entregados
    Egresos: cargos adicionales (incidentes, demoras, etc.)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if not start_date or not end_date:
            return Response({
                "error": "Faltan parámetros start_date o end_date"
            }, status=400)

        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                "error": "Formato de fecha inválido. Use YYYY-MM-DD"
            }, status=400)

        # INGRESOS: Pedidos confirmados/entregados agrupados por fecha
        ingresos_query = Pedido.objects.filter(
            fecha_hora_evento__date__gte=start,
            fecha_hora_evento__date__lte=end,
            estado__in=['confirmado', 'entregado']
        ).annotate(
            fecha=TruncDate('fecha_hora_evento')
        ).values('fecha').annotate(
            total_ingresos=Sum('total')
        ).order_by('fecha')

        # EGRESOS: Cargos adicionales agrupados por fecha
        egresos_query = Cargo.objects.filter(
            creado_en__date__gte=start,
            creado_en__date__lte=end,
        ).annotate(
            fecha=TruncDate('creado_en')
        ).values('fecha').annotate(
            total_egresos=Sum('monto')
        ).order_by('fecha')

        # Crear diccionario de fechas para combinar datos
        data_dict = {}
        
        # Agregar ingresos
        for item in ingresos_query:
            fecha = item['fecha']
            data_dict[fecha] = {
                'fecha': fecha.strftime('%Y-%m-%d'),
                'ingresos': float(item['total_ingresos'] or 0),
                'egresos': 0
            }
        
        # Agregar egresos
        for item in egresos_query:
            fecha = item['fecha']
            if fecha not in data_dict:
                data_dict[fecha] = {
                    'fecha': fecha.strftime('%Y-%m-%d'),
                    'ingresos': 0,
                    'egresos': 0
                }
            data_dict[fecha]['egresos'] = float(item['total_egresos'] or 0)

        # Convertir a lista ordenada
        chart_data = [
            {
                'fecha': v['fecha'],
                'ingresos': round(v['ingresos'], 2),
                'egresos': round(v['egresos'], 2)
            }
            for k, v in sorted(data_dict.items())
        ]

        return Response({
            "chart_data": chart_data,
            "start_date": start_date,
            "end_date": end_date,
        })


class PaymentDistributionView(APIView):
    """
    Distribución de formas de pago en pedidos confirmados/entregados
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Contar pedidos por forma de pago
        pedidos = Pedido.objects.filter(
            estado__in=['confirmado', 'entregado']
        ).exclude(
            forma_pago=''
        ).values('forma_pago').annotate(
            count=Count('id')
        )

        total_pedidos = sum(p['count'] for p in pedidos)
        
        if total_pedidos == 0:
            # Si no hay datos, devolver distribución simulada
            return Response({
                "distribution": [
                    {"name": "Efectivo", "value": 45, "color": "#10b981"},
                    {"name": "Transferencia", "value": 55, "color": "#3b82f6"},
                ]
            })

        # Agrupar formas de pago similares
        efectivo_count = 0
        transferencia_count = 0
        tarjeta_count = 0
        otros_count = 0

        for p in pedidos:
            forma = p['forma_pago'].lower()
            count = p['count']
            
            if 'efectivo' in forma or 'cash' in forma:
                efectivo_count += count
            elif 'transfer' in forma or 'deposito' in forma or 'banco' in forma:
                transferencia_count += count
            elif 'tarjeta' in forma or 'card' in forma or 'debito' in forma or 'credito' in forma:
                tarjeta_count += count
            else:
                otros_count += count

        # Calcular porcentajes
        distribution = []
        
        if efectivo_count > 0:
            porcentaje = round((efectivo_count / total_pedidos) * 100, 1)
            distribution.append({
                "name": "Efectivo",
                "value": porcentaje,
                "color": "#10b981"
            })
        
        if transferencia_count > 0:
            porcentaje = round((transferencia_count / total_pedidos) * 100, 1)
            distribution.append({
                "name": "Transferencia",
                "value": porcentaje,
                "color": "#3b82f6"
            })
        
        if tarjeta_count > 0:
            porcentaje = round((tarjeta_count / total_pedidos) * 100, 1)
            distribution.append({
                "name": "Tarjeta",
                "value": porcentaje,
                "color": "#f59e0b"
            })
        
        if otros_count > 0:
            porcentaje = round((otros_count / total_pedidos) * 100, 1)
            distribution.append({
                "name": "Otros",
                "value": porcentaje,
                "color": "#8b5cf6"
            })

        # Si no hay distribución, usar valores por defecto
        if not distribution:
            distribution = [
                {"name": "Efectivo", "value": 45, "color": "#10b981"},
                {"name": "Transferencia", "value": 55, "color": "#3b82f6"},
            ]

        return Response({"distribution": distribution})


class DashboardStatsExtendedView(APIView):
    """
    Estadísticas extendidas para el dashboard
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        
        # Alquileres activos (no finalizados ni cancelados)
        alquileres_activos = Alquiler.objects.exclude(
            estado__in=['finalizado', 'cancelado']
        ).count()

        # Productos en incidentes (fuera de servicio)
        productos_en_incidente = Incidente.objects.filter(
            estado_incidente='abierto'
        ).aggregate(
            total=Sum('cantidad_afectada')
        )['total'] or 0

        # Garantías pendientes de devolución
        garantias_pendientes = Alquiler.objects.filter(
            garantia_estado='pendiente',
            estado='finalizado'
        ).count()

        # Pedidos próximos (en los próximos 7 días)
        fecha_limite = now + timedelta(days=7)
        pedidos_proximos = Pedido.objects.filter(
            fecha_hora_evento__gte=now,
            fecha_hora_evento__lte=fecha_limite,
            estado='confirmado'
        ).count()

        return Response({
            "alquileres_activos": alquileres_activos,
            "productos_en_incidente": productos_en_incidente,
            "garantias_pendientes": garantias_pendientes,
            "pedidos_proximos": pedidos_proximos,
        })


class PaymentsFlowChartView(APIView):
    """
    ✅ CORREGIDO: Gráfico de flujo de caja basado en PAGOS (modelo Pago).
    Filtra los pagos por fecha usando un rango inclusivo y devuelve los totales generales.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')

        if not start_date_str or not end_date_str:
            return Response({
                "error": "Faltan parámetros start_date o end_date"
            }, status=400)

        try:
            # 1. Convertimos la fecha de inicio a datetime (00:00:00)
            start_dt = datetime.strptime(start_date_str, '%Y-%m-%d')
            
            # 2. Definimos el LÍMITE SUPERIOR: el inicio del DÍA SIGUIENTE
            end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d')
            end_boundary_dt = end_date_obj + timedelta(days=1)
            
        except ValueError:
            return Response({
                "error": "Formato de fecha inválido. Use YYYY-MM-DD"
            }, status=400)


        # Filtro base: fecha_pago >= start_dt AND fecha_pago < end_boundary_dt
        base_filter = Q(
            fecha_pago__gte=start_dt, 
            fecha_pago__lt=end_boundary_dt
        )
        
        # 💰 1. Agregación para OBTENER LOS TOTALES GENERALES DEL PERÍODO (Tu objetivo principal)
        totals = Pago.objects.filter(base_filter).aggregate(
            total_ingresos=Sum('monto', filter=Q(sentido='INGRESO')),
            total_egresos=Sum('monto', filter=Q(sentido='EGRESO'))
        )
        
        total_ingresos_general = float(totals['total_ingresos'] or 0)
        total_egresos_general = float(totals['total_egresos'] or 0)


        # 📊 2. Consultas para datos diarios (para el gráfico)
        
        # INGRESOS: Pagos con sentido INGRESO
        ingresos_query = Pago.objects.filter(
            base_filter, 
            sentido='INGRESO'
        ).annotate(
            fecha=TruncDate('fecha_pago')
        ).values('fecha').annotate(
            total_ingresos=Sum('monto')
        ).order_by('fecha')

        # EGRESOS: Pagos con sentido EGRESO
        egresos_query = Pago.objects.filter(
            base_filter, 
            sentido='EGRESO'
        ).annotate(
            fecha=TruncDate('fecha_pago')
        ).values('fecha').annotate(
            total_egresos=Sum('monto')
        ).order_by('fecha')
        
        # Crear diccionario de fechas para combinar datos
        data_dict = {}
        
        # Agregar ingresos
        for item in ingresos_query:
            fecha = item['fecha']
            data_dict[fecha] = {
                'fecha': fecha.strftime('%Y-%m-%d'),
                'ingresos': float(item['total_ingresos'] or 0),
                'egresos': 0
            }
        
        # Agregar egresos
        for item in egresos_query:
            fecha = item['fecha']
            if fecha not in data_dict:
                data_dict[fecha] = {
                    'fecha': fecha.strftime('%Y-%m-%d'),
                    'ingresos': 0,
                    'egresos': 0
                }
            data_dict[fecha]['egresos'] = float(item['total_egresos'] or 0)

        # Convertir a lista ordenada
        chart_data = [
            {
                'fecha': v['fecha'],
                'ingresos': round(v['ingresos'], 2),
                'egresos': round(v['egresos'], 2)
            }
            for k, v in sorted(data_dict.items())
        ]

        # Devolvemos los datos diarios Y los totales generales.
        return Response({
            "chart_data": chart_data,
            "start_date": start_date_str,
            "end_date": end_date_str,
            "total_ingresos": total_ingresos_general, # Nuevos campos
            "total_egresos": total_egresos_general,  # Nuevos campos
        })