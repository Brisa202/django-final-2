from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Incidente
from .serializers import IncidenteSerializer


class IncidenteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidenteSerializer

    # 👇 filtros que usa tu UI: ?estado=..., ?det_alquiler=...
    def get_queryset(self):
        qs = Incidente.objects.all()
        estado = self.request.query_params.get('estado')
        det_id = self.request.query_params.get('det_alquiler')
        if estado:
            qs = qs.filter(estado_incidente=estado)
        if det_id:
            qs = qs.filter(det_alquiler_id=det_id)
        return qs

    # Borrar sólo si está resuelto
    def destroy(self, request, *args, **kwargs):
        incidente = self.get_object()
        if incidente.estado_incidente != 'resuelto':
            return Response(
                {"detail": "No se puede eliminar un incidente que no está resuelto."},
                status=status.HTTP_400_BAD_REQUEST
            )
        incidente.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

