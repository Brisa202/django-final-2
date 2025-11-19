# accounts/views.py
from django.contrib.auth import get_user_model, authenticate, login
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status 
from .models import Perfil, FailedLoginAttempt
from .serializers import FailedLoginAttemptSerializer

User = get_user_model()

MAX_LOGIN_ATTEMPTS = 5

class LoginAPIView(APIView):
    """
    Maneja el inicio de sesión, el conteo de intentos fallidos y el bloqueo de cuenta.
    """
    permission_classes = [] 

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            # ÉXITO: Reiniciar el contador y loguear
            if user.is_active:
                if hasattr(user, 'perfil'):
                    user.perfil.reset_failed_attempts()
                
                login(request, user) 

                groups = list(user.groups.values_list('name', flat=True))
                return Response({
                    'success': True,
                    'message': 'Login exitoso.',
                    'id': user.id,
                    'username': user.username,
                    'groups': groups,
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False, 
                    'message': 'Tu cuenta está bloqueada. Contacta a un administrador.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        else:
            # FALLO: Contar intentos fallidos
            message = 'Credenciales inválidas. Intento de autenticación fallido.'
            
            try:
                user_to_check = User.objects.get(username=username)
                
                if user_to_check.is_active and hasattr(user_to_check, 'perfil'):
                    perfil = user_to_check.perfil
                    
                    perfil.failed_login_attempts += 1
                    perfil.save(update_fields=['failed_login_attempts'])
                    
                    attempts_left = MAX_LOGIN_ATTEMPTS - perfil.failed_login_attempts
                    
                    if perfil.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                        user_to_check.is_active = False
                        user_to_check.save(update_fields=['is_active'])
                        message = "Demasiados intentos fallidos. Tu cuenta ha sido bloqueada. Contacta a un administrador."
                    elif attempts_left > 0 and attempts_left <= 2: 
                        message += f" Te quedan {attempts_left} intentos antes de que tu cuenta sea bloqueada."
                        
            except User.DoesNotExist:
                pass

            return Response({'success': False, 'message': message}, status=status.HTTP_401_UNAUTHORIZED)


class PerfilUsuarioAPIView(APIView):
    """
    Devuelve perfil básico + grupos + alertas de seguridad
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        grupos = list(u.groups.values_list('name', flat=True))

        # 🔥 NUEVO: Obtener el rol del perfil
        rol = None
        if hasattr(u, 'perfil'):
            rol = u.perfil.rol  # 'chofer', 'cajero', 'administrador', etc.

        # 🔍 Contar intentos no reconocidos
        unacknowledged_count = FailedLoginAttempt.objects.filter(
            user=u, acknowledged=False
        ).count()

        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "groups": grupos,
            "rol": rol,  # 👈 AGREGAR ESTA LÍNEA
            "unacknowledged_failed_attempts": unacknowledged_count,
        })
class FailedLoginAttemptsAPIView(APIView):
    """
    GET: Obtiene los intentos fallidos no reconocidos del usuario autenticado
    POST: Marca todos los intentos como reconocidos
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Obtiene los últimos intentos fallidos no reconocidos"""
        attempts = FailedLoginAttempt.objects.filter(
            user=request.user,
            acknowledged=False
        )[:10]
        
        serializer = FailedLoginAttemptSerializer(attempts, many=True)
        return Response({
            'count': attempts.count(),
            'attempts': serializer.data
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Marca todos los intentos fallidos como reconocidos"""
        updated = FailedLoginAttempt.objects.filter(
            user=request.user,
            acknowledged=False
        ).update(acknowledged=True)
        
        return Response({
            'success': True,
            'message': f'{updated} intento(s) marcado(s) como reconocido(s).'
        }, status=status.HTTP_200_OK)


class FailedLoginHistoryAPIView(APIView):
    """
    Obtiene todo el historial de intentos fallidos (últimos 30 días)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        since = timezone.now() - timedelta(days=30)
        
        attempts = FailedLoginAttempt.objects.filter(
            user=request.user,
            timestamp__gte=since
        )[:50]
        
        serializer = FailedLoginAttemptSerializer(attempts, many=True)
        return Response({
            'total': attempts.count(),
            'attempts': serializer.data
        }, status=status.HTTP_200_OK)