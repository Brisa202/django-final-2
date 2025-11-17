# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Perfil, FailedLoginAttempt

# 1. Serializer para el Perfil
class PerfilSerializer(serializers.ModelSerializer):
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)
    
    class Meta:
        model = Perfil
        fields = ('rol', 'rol_display')

# 2. Serializer para el Usuario (Incluye el Perfil anidado)
class UsuarioSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'perfil')
        read_only_fields = ('username', 'email')

# 3. Serializer para intentos fallidos
class FailedLoginAttemptSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = FailedLoginAttempt
        fields = ('id', 'username_attempted', 'ip_address', 'timestamp', 
                  'user_agent', 'acknowledged', 'time_ago')
    
    def get_time_ago(self, obj):
        """Calcula hace cuánto tiempo fue el intento"""
        from django.utils import timezone
        delta = timezone.now() - obj.timestamp
        
        if delta.days > 0:
            return f"hace {delta.days} día(s)"
        elif delta.seconds >= 3600:
            hours = delta.seconds // 3600
            return f"hace {hours} hora(s)"
        elif delta.seconds >= 60:
            minutes = delta.seconds // 60
            return f"hace {minutes} minuto(s)"
        else:
            return "hace unos segundos"
        
# ejemplo en DRF
class PerfilSerializer(serializers.ModelSerializer):
    unacknowledged_failed_attempts = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_superuser', 'unacknowledged_failed_attempts']