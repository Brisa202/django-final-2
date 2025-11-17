# productos/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class SoloAdminEdita(BasePermission):
    """
    GET/HEAD/OPTIONS: permitido a autenticados
    POST/PATCH/PUT/DELETE: solo Admin (o superuser)
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        # admin si está en grupo Admin o es superuser
        is_admin_group = request.user.groups.filter(name__iexact='Admin').exists()
        return request.user and request.user.is_authenticated and (request.user.is_superuser or is_admin_group)
