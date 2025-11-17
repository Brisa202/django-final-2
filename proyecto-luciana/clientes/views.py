# clientes/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Cliente
from .serializers import ClienteSerializer

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.order_by('-creado_en')
    serializer_class = ClienteSerializer

    def get_permissions(self):
        # leer SIEMPRE autenticado; crear también autenticado; editar/borrar solo admin
        if self.action in ['list', 'retrieve', 'create']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]
