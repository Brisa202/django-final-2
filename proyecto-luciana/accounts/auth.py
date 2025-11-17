# accounts/auth.py
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import exceptions
from datetime import timedelta
from accounts.models import Perfil, FailedLoginAttempt

User = get_user_model()

MAX_ATTEMPTS = 3
LOCK_MINUTES = 15
CACHE_PREFIX = "auth"

def _keys(identifier: str):
    return (
        f"{CACHE_PREFIX}:attempts:{identifier}",
        f"{CACHE_PREFIX}:blocked_until:{identifier}",
    )

def _now():
    return timezone.now()

class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_field = attrs.get(self.username_field) 
        password = attrs.get("password")

        if not login_field or not password:
            raise exceptions.ValidationError("Faltan credenciales.")

        identifier = login_field.strip().lower()

        request = self.context.get("request")
        ip = getattr(request, "META", {}).get("REMOTE_ADDR", "0.0.0.0")
        user_agent = getattr(request, "META", {}).get("HTTP_USER_AGENT", "")
        rate_id = f"{identifier}|{ip}"

        attempts_key, blocked_key = _keys(rate_id)
        blocked_until = cache.get(blocked_key)
        
        # 1. Chequeo de bloqueo temporal (CACHE)
        if blocked_until and _now() < blocked_until:
            mins = int((blocked_until - _now()).total_seconds() // 60) + 1
            raise exceptions.PermissionDenied(
                detail={"detail": "Usuario bloqueado por intentos fallidos.", "locked_for_minutes": mins}
            )

        # Buscar el usuario
        username = identifier
        user_to_check = None
        if "@" in identifier:
            try:
                user_to_check = User.objects.get(email__iexact=identifier)
                username = user_to_check.username
            except User.DoesNotExist:
                pass
        else:
            try:
                user_to_check = User.objects.get(username__iexact=identifier)
            except User.DoesNotExist:
                pass

        user = authenticate(self.context.get("request"), username=username, password=password)
        
        if not user:
            # 🔴 FALLO → REGISTRAR EN DB Y CACHE 🔴
            
            # 1. Registrar en el historial (DB)
            FailedLoginAttempt.objects.create(
                user=user_to_check,
                username_attempted=identifier,
                ip_address=ip,
                user_agent=user_agent,
                acknowledged=False
            )
            
            # 2. Actualizar contador en Perfil (para compatibilidad)
            if user_to_check and hasattr(user_to_check, 'perfil'):
                perfil = user_to_check.perfil
                perfil.failed_login_attempts_for_alert += 1
                perfil.last_failed_attempt_ip = ip
                perfil.last_failed_attempt_timestamp = _now()
                perfil.save(update_fields=['failed_login_attempts_for_alert', 'last_failed_attempt_ip', 'last_failed_attempt_timestamp'])
            
            # 3. Lógica de bloqueo TEMPORAL (cache)
            attempts = cache.get(attempts_key, 0) + 1
            cache.set(attempts_key, attempts, timeout=LOCK_MINUTES * 60) 
            remaining = max(0, MAX_ATTEMPTS - attempts)
            
            if attempts >= MAX_ATTEMPTS:
                cache.set(blocked_key, _now() + timedelta(minutes=LOCK_MINUTES), timeout=LOCK_MINUTES * 60)
                raise exceptions.PermissionDenied(
                    detail={"detail": "Demasiados intentos. Bloqueado temporalmente.", "locked_for_minutes": LOCK_MINUTES}
                )
                
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Credenciales inválidas.", "remaining_attempts": remaining}
            )

        # 🟢 ÉXITO → RESETEAR Y CONTAR INTENTOS NO VISTOS 🟢
        
        cache.delete_many([attempts_key, blocked_key])

        if not user.is_active:
            raise exceptions.PermissionDenied("Usuario inactivo.")
        
        # Contar intentos fallidos no reconocidos
        unacknowledged_attempts = FailedLoginAttempt.objects.filter(
            user=user,
            acknowledged=False
        ).count()
        
        # Generar tokens
        data = super().validate({"username": user.username, "password": password})
        
        # Añadir campos extra a la respuesta
        data["user"] = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "groups": list(user.groups.values_list("name", flat=True)),
            "unacknowledged_failed_attempts": unacknowledged_attempts,
        }
        
        return data


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
