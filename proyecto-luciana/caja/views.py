# caja/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, time
from .models import Caja, HistorialCaja
from .serializers import CajaSerializer, HistorialCajaSerializer


class CajaViewSet(viewsets.ModelViewSet):
    queryset = Caja.objects.all()
    serializer_class = CajaSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def caja_abierta(self, request):
        """Obtiene la caja abierta actualmente"""
        caja = Caja.objects.filter(estado='ABIERTA').first()
        if not caja:
            return Response(
                {'error': 'No hay caja abierta'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(caja)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def empleados_disponibles(self, request):
        """Obtiene lista de empleados disponibles para asignar a caja"""
        from empleados.models import Empleado
        empleados = Empleado.objects.filter(activo=True).values('id_empleados', 'nombre', 'apellido')
        # Formatear para el frontend
        empleados_lista = [
            {
                'id_empleado': emp['id_empleados'],
                'nombre': f"{emp['nombre']} {emp['apellido']}"
            }
            for emp in empleados
        ]
        return Response(empleados_lista)
    
    @action(detail=False, methods=['get'])
    def movimientos_hoy(self, request):
        """Obtiene los movimientos de caja del día actual"""
        try:
            # Obtener la caja abierta
            caja = Caja.objects.filter(estado='ABIERTA').first()
            
            if not caja:
                return Response({
                    'movimientos': [],
                    'resumen': {
                        'ingresos': 0,
                        'egresos': 0,
                        'balance': 0
                    }
                }, status=status.HTTP_200_OK)
            
            # Obtener todos los pagos de esta caja
            from pagos.models import Pago
            
            pagos = Pago.objects.filter(caja=caja).select_related(
                'cliente', 'pedido', 'alquiler'
            ).order_by('-fecha_pago')
            
            # Formatear los movimientos
            movimientos = []
            for pago in pagos:
                movimientos.append({
                    'id': pago.id_pago,
                    'fecha': pago.fecha_pago.isoformat(),
                    'tipo': pago.sentido,  # INGRESO o EGRESO
                    'categoria': pago.get_tipo_pago_display(),
                    'monto': float(pago.monto),
                    'metodo_pago': pago.metodo_pago,
                    'descripcion': pago.notas or pago.get_tipo_pago_display(),
                    'cliente': str(pago.cliente) if pago.cliente else None,
                })
            
            # Calcular totales
            ingresos = sum(m['monto'] for m in movimientos if m['tipo'] == 'INGRESO')
            egresos = sum(m['monto'] for m in movimientos if m['tipo'] == 'EGRESO')
            
            return Response({
                'movimientos': movimientos,
                'resumen': {
                    'ingresos': ingresos,
                    'egresos': egresos,
                    'balance': ingresos - egresos
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'movimientos': [],
                'resumen': {'ingresos': 0, 'egresos': 0, 'balance': 0}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        """Crear/abrir una nueva caja"""
        try:
            # Verificar que no haya otra caja abierta
            caja_abierta = Caja.objects.filter(estado='ABIERTA').first()
            if caja_abierta:
                return Response(
                    {'error': f'Ya hay una caja abierta: #{caja_abierta.id_caja}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener datos
            empleado_id = request.data.get('empleado')
            balance_inicial = request.data.get('balance_inicial', 0)
            
            if not empleado_id:
                return Response(
                    {'error': 'El campo empleado es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener el empleado
            from empleados.models import Empleado
            try:
                empleado = Empleado.objects.get(id_empleados=empleado_id)
            except Empleado.DoesNotExist:
                return Response(
                    {'error': f'Empleado con ID {empleado_id} no existe'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Crear la caja - CORRECCIÓN: No convertir a float, Django convierte automáticamente a Decimal
            caja = Caja.objects.create(
                usuario_apertura=request.user,
                empleado=empleado,
                monto_inicial_efectivo=balance_inicial,
                monto_inicial_transferencia=0,
                notas_apertura=request.data.get('notas', '')
            )
            
            # Registrar en historial
            HistorialCaja.objects.create(
                caja=caja,
                tipo_evento='APERTURA',
                descripcion=f'Caja abierta por {request.user.get_full_name()} - Cajero: {empleado.nombre}',
                usuario=request.user,
                detalles={
                    'empleado_id': str(empleado_id),
                    'empleado_nombre': empleado.nombre,
                    'balance_inicial': str(balance_inicial),
                }
            )
            
            serializer = self.get_serializer(caja)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cerrar_caja(self, request, pk=None):
        """Cierra la caja actual"""
        try:
            caja = self.get_object()
            
            if caja.estado == 'CERRADA':
                return Response(
                    {'error': 'Esta caja ya está cerrada'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener balance final del request - CORRECCIÓN: No convertir a float
            balance_final = request.data.get('balance_final', 0)
            
            # Cerrar la caja
            caja.cerrar(
                usuario=request.user,
                monto_final_efectivo=balance_final,
                monto_final_transferencia=0,
                notas=request.data.get('notas', '')
            )
            
            serializer = self.get_serializer(caja)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def resumen(self, request, pk=None):
        """Obtiene un resumen detallado de la caja"""
        try:
            caja = self.get_object()
            
            data = {
                'caja_id': caja.id_caja,
                'empleado': {
                    'id': caja.empleado.id_empleados,
                    'nombre': str(caja.empleado.nombre),
                },
                'estado': caja.estado,
                'fecha_apertura': caja.fecha_apertura,
                'fecha_cierre': caja.fecha_cierre,
                'usuario_apertura': caja.usuario_apertura.get_full_name(),
                'usuario_cierre': caja.usuario_cierre.get_full_name() if caja.usuario_cierre else None,
                
                # Dinero inicial
                'monto_inicial_efectivo': float(caja.monto_inicial_efectivo),
                'monto_inicial_transferencia': float(caja.monto_inicial_transferencia),
                
                # Ingresos
                'ingresos_efectivo': float(caja.obtener_ingresos_efectivo()),
                'ingresos_transferencia': float(caja.obtener_ingresos_transferencia()),
                'total_ingresos': float(caja.obtener_total_ingresos()),
                
                # Egresos
                'egresos_efectivo': float(caja.obtener_egresos_efectivo()),
                'egresos_transferencia': float(caja.obtener_egresos_transferencia()),
                'total_egresos': float(caja.obtener_total_egresos()),
                
                # Balances teóricos
                'balance_efectivo_teorico': float(caja.obtener_balance_efectivo_teorico()),
                'balance_transferencia_teorico': float(caja.obtener_balance_transferencia_teorico()),
                'balance_total_teorico': float(caja.obtener_balance_total_teorico()),
                
                # Arqueo final
                'monto_final_efectivo': float(caja.monto_final_efectivo) if caja.monto_final_efectivo else None,
                'monto_final_transferencia': float(caja.monto_final_transferencia) if caja.monto_final_transferencia else None,
                'diferencia_efectivo': float(caja.diferencia_efectivo) if caja.diferencia_efectivo else None,
                'diferencia_transferencia': float(caja.diferencia_transferencia) if caja.diferencia_transferencia else None,
            }
            
            return Response(data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )