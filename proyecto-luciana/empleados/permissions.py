# empleados/permissions.py
from rest_framework.permissions import BasePermission

class EsUsuarioAdministrador(BasePermission):
    """
    Permite la acción solo a administradores. Considera:
      - superusuario,
      - pertenecer al grupo 'Admin' o 'Administrador',
      - o tener perfil.rol == 'administrador'
    """
    message = 'Solo los usuarios con rol de Administrador pueden realizar esta acción.'

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        # superuser siempre puede
        if user.is_superuser:
            return True

        # por grupos
        if user.groups.filter(name__iexact='admin').exists() or \
           user.groups.filter(name__iexact='administrador').exists():
            return True

        # por perfil (si existe)
        perfil = getattr(user, 'perfil', None)
        rol = getattr(perfil, 'rol', '').lower() if perfil else ''
        if rol == 'administrador':
            return True

        return False
