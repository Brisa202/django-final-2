# productos/serializers.py
from django.db.models import Sum
from rest_framework import serializers
from .models import Producto

class ProductoSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    # Calculados para alinear con el modal /reservas/
    stock_reservado = serializers.SerializerMethodField()
    stock_disponible = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = (
            'id', 'nombre', 'descripcion', 'categoria', 'categoria_display',
            'precio', 'stock', 'stock_reservado', 'stock_disponible',
            'imagen_url', 'activo'
        )

    def get_stock_reservado(self, obj: Producto) -> int:
        from pedidos.models import DetPedido
        from alquileres.models import DetAlquiler

        activos = ('pendiente', 'confirmado')

        pedidos = (
            DetPedido.objects
            .filter(producto=obj, pedido__estado__in=activos)
            .aggregate(s=Sum('cantidad'))
            .get('s') or 0
        )

        # Igual que en views: excluir alquileres creados desde un Pedido
        alquileres = (
            DetAlquiler.objects
            .filter(producto=obj, alquiler__estado__in=activos, alquiler__pedido__isnull=True)
            .aggregate(s=Sum('cantidad'))
            .get('s') or 0
        )

        return int(pedidos + alquileres)

    def get_stock_disponible(self, obj: Producto) -> int:
        reservado = self.get_stock_reservado(obj)
        try:
            return max(int(obj.stock) - int(reservado), 0)
        except Exception:
            return 0


# Para listar disponibilidad por rango (incluye 'disponible')
class ProductoDisponibilidadSerializer(serializers.ModelSerializer):
    disponible = serializers.IntegerField(read_only=True)
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model = Producto
        fields = (
            'id','nombre','categoria','categoria_display','precio',
            'stock','stock_reservado','disponible'
        )
