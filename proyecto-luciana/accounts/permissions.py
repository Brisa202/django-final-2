# accounts/permissions.py
from rest_framework import permissions
from functools import wraps
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied

# ============================================
# PERMISOS PARA DJANGO REST FRAMEWORK
# ============================================

class IsAdministrador(permissions.BasePermission):
    """
    Permite acceso solo a usuarios con rol 'administrador' o superusuarios
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
            
        return (
            hasattr(request.user, 'perfil') and 
            request.user.perfil.rol == 'administrador'
        )


class IsEmpleadoOrAbove(permissions.BasePermission):
    """
    Permite acceso a empleados y superiores (administradores)
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
            
        if not hasattr(request.user, 'perfil'):
            return False
            
        return request.user.perfil.rol in [
            'administrador', 
            'empleado', 
            'encargado'
        ]


class IsChofer(permissions.BasePermission):
    """
    Permite acceso solo a choferes
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        return (
            hasattr(request.user, 'perfil') and 
            request.user.perfil.rol == 'chofer'
        )


class IsEncargado(permissions.BasePermission):
    """
    Permite acceso a encargados y administradores
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
            
        if not hasattr(request.user, 'perfil'):
            return False
            
        return request.user.perfil.rol in ['administrador', 'encargado']


class HasAnyRole(permissions.BasePermission):
    """
    Permiso dinámico que acepta una lista de roles permitidos.
    Uso: permission_classes = [HasAnyRole]
    Y en la vista definir: required_roles = ['chofer', 'administrador']
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
            
        if not hasattr(request.user, 'perfil'):
            return False
        
        # Obtener roles requeridos de la vista
        required_roles = getattr(view, 'required_roles', [])
        
        if not required_roles:
            return True  # Si no hay roles definidos, permitir acceso
            
        return request.user.perfil.rol in required_roles


# ============================================
# DECORADORES PARA VISTAS BASADAS EN FUNCIONES
# ============================================

def role_required(allowed_roles):
    """
    Decorador que verifica si el usuario tiene uno de los roles permitidos.
    
    Uso:
        @role_required(['administrador', 'encargado'])
        @api_view(['GET'])
        def mi_vista(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'No autenticado'}, 
                    status=401
                )
            
            # Superusuarios siempre tienen acceso
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            
            # Verificar si tiene perfil
            if not hasattr(request.user, 'perfil'):
                return JsonResponse(
                    {'error': 'Usuario sin perfil asignado'}, 
                    status=403
                )
            
            # Verificar rol
            if request.user.perfil.rol not in allowed_roles:
                return JsonResponse(
                    {
                        'error': 'No tienes permisos para acceder a este recurso',
                        'rol_requerido': allowed_roles,
                        'tu_rol': request.user.perfil.rol
                    }, 
                    status=403
                )
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def admin_required(view_func):
    """
    Decorador simplificado para requerir rol de administrador.
    
    Uso:
        @admin_required
        @api_view(['POST'])
        def crear_usuario(request):
            ...
    """
    return role_required(['administrador'])(view_func)


# ============================================
# FUNCIONES DE UTILIDAD
# ============================================

def user_has_role(user, role):
    """
    Verifica si un usuario tiene un rol específico.
    
    Args:
        user: Usuario de Django
        role: String con el nombre del rol
        
    Returns:
        bool: True si tiene el rol, False si no
    """
    if user.is_superuser:
        return True
        
    if not hasattr(user, 'perfil'):
        return False
        
    return user.perfil.rol == role


def user_has_any_role(user, roles):
    """
    Verifica si un usuario tiene alguno de los roles especificados.
    
    Args:
        user: Usuario de Django
        roles: Lista de strings con nombres de roles
        
    Returns:
        bool: True si tiene algún rol, False si no
    """
    if user.is_superuser:
        return True
        
    if not hasattr(user, 'perfil'):
        return False
        
    return user.perfil.rol in roles


def get_user_role(user):
    """
    Obtiene el rol de un usuario.
    
    Args:
        user: Usuario de Django
        
    Returns:
        str: Nombre del rol o None si no tiene perfil
    """
    if user.is_superuser:
        return 'administrador'
        
    if hasattr(user, 'perfil'):
        return user.perfil.rol
        
    return None


# ============================================
# CONFIGURACIÓN DE PERMISOS POR ROL
# ============================================

ROLE_PERMISSIONS = {
    'administrador': {
        'can_create_users': True,
        'can_edit_users': True,
        'can_delete_users': True,
        'can_assign_roles': True,
        'can_view_reports': True,
        'can_manage_all': True,
    },
    'encargado': {
        'can_create_users': False,
        'can_edit_users': True,
        'can_delete_users': False,
        'can_assign_roles': False,
        'can_view_reports': True,
        'can_manage_team': True,
    },
    'empleado': {
        'can_create_users': False,
        'can_edit_users': False,
        'can_delete_users': False,
        'can_assign_roles': False,
        'can_view_reports': False,
        'can_view_own_data': True,
    },
    'chofer': {
        'can_create_users': False,
        'can_edit_users': False,
        'can_delete_users': False,
        'can_assign_roles': False,
        'can_view_routes': True,
        'can_update_delivery_status': True,
    },
    'operario_carga': {
        'can_manage_inventory': True,
        'can_load_unload': True,
    },
    'cajero': {
        'can_process_payments': True,
        'can_view_sales': True,
    },
}


def user_can(user, permission):
    """
    Verifica si un usuario tiene un permiso específico según su rol.
    
    Args:
        user: Usuario de Django
        permission: String con el nombre del permiso (ej: 'can_create_users')
        
    Returns:
        bool: True si tiene el permiso, False si no
    """
    if user.is_superuser:
        return True
        
    if not hasattr(user, 'perfil'):
        return False
        
    role = user.perfil.rol
    role_perms = ROLE_PERMISSIONS.get(role, {})
    
    return role_perms.get(permission, False)