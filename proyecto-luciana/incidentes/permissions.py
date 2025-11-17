from rest_framework.permissions import BasePermission, SAFE_METHODS

class IncidentePermiso(BasePermission):
    """
    - GET: cualquier autenticado
    - POST: autenticado (empleado puede crear)
    - PATCH/PUT/DELETE: solo Admin o superuser
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS or request.method == 'POST':
            return request.user and request.user.is_authenticated
        is_admin_group = request.user.groups.filter(name__iexact='Admin').exists()
        return request.user.is_authenticated and (request.user.is_superuser or is_admin_group)
