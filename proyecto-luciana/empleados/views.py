# empleados/views.py
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q

from .models import Empleado
from .serializers import (
    EmpleadoSerializer,
    EmpleadoCreacionSerializer,
    EmpleadoUpdateSerializer
)


class EmpleadoViewSet(ModelViewSet):
    queryset = Empleado.objects.all()
    
    def get_serializer_class(self):
        """Usa diferentes serializers según la acción"""
        if self.action == 'create':
            return EmpleadoCreacionSerializer
        elif self.action in ['update', 'partial_update']:
            return EmpleadoUpdateSerializer
        return EmpleadoSerializer

    def get_queryset(self):
        """Filtra empleados por activo y/o rol"""
        queryset = Empleado.objects.select_related('usuario__perfil').all()
        
        # Filtro por activo/inactivo
        activo = self.request.query_params.get('activo', None)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        
        # 🆕 Filtro por ROL
        rol = self.request.query_params.get('rol', None)
        if rol:
            queryset = queryset.filter(usuario__perfil__rol=rol)
        
        # Búsqueda por texto
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(apellido__icontains=search) |
                Q(dni__icontains=search)
            )
        
        return queryset.order_by('apellido', 'nombre')

    @action(detail=False, methods=['get'], url_path='lista-simple')
    def lista_simple(self, request):
        """Endpoint simplificado para selects - devuelve empleados activos"""
        empleados = Empleado.objects.filter(activo=True).select_related('usuario__perfil')
        
        empleados_lista = [
            {
                'id_empleado': emp.id_empleados,
                'nombre': f"{emp.nombre} {emp.apellido}",
                'apellido': emp.apellido,
                'dni': emp.dni,
                'rol': emp.usuario.perfil.rol if hasattr(emp.usuario, 'perfil') else 'empleado',
                'rol_display': emp.usuario.perfil.get_rol_display() if hasattr(emp.usuario, 'perfil') else 'Empleado'
            }
            for emp in empleados
        ]
        
        return Response(empleados_lista, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='roles-disponibles')
    def roles_disponibles(self, request):
        """Lista todos los roles disponibles para filtros"""
        from accounts.models import Perfil
        
        roles = [
            {'value': rol[0], 'label': rol[1]} 
            for rol in Perfil.ROLES_CHOICES
        ]
        
        return Response(roles, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='estadisticas')
    def estadisticas(self, request):
        """Devuelve contadores por rol y estado activo"""
        from accounts.models import Perfil
        
        stats = {
            'total': Empleado.objects.count(),
            'activos': Empleado.objects.filter(activo=True).count(),
            'inactivos': Empleado.objects.filter(activo=False).count(),
            'por_rol': []
        }
        
        # Contar empleados por cada rol
        for rol_code, rol_label in Perfil.ROLES_CHOICES:
            count = Empleado.objects.filter(
                usuario__perfil__rol=rol_code,
                activo=True
            ).count()
            
            stats['por_rol'].append({
                'value': rol_code,
                'label': rol_label,
                'count': count
            })
        
        return Response(stats, status=status.HTTP_200_OK)