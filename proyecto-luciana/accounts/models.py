# accounts/models.py
from django.db import models
from django.contrib.auth.models import User, Group
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class Perfil(models.Model):
    ROLES_CHOICES = (
        ('administrador', 'Administrador'),
        ('empleado', 'Empleado'),
        ('chofer', 'Chofer'),
        ('operario_carga', 'Operario de Carga y Descarga'),
        ('encargado', 'Encargado'),
        ('limpieza', 'Personal de Limpieza'),
        ('lavanderia', 'Operaria de Lavandería'),
        ('cajero', 'Cajero'),
    )

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=20, choices=ROLES_CHOICES, default='empleado')
    
    # 🌟 CAMPOS PARA ALERTA EN DASHBOARD (Persistentes) 🌟
    failed_login_attempts_for_alert = models.IntegerField(default=0) 
    last_failed_attempt_ip = models.CharField(max_length=45, null=True, blank=True) 
    last_failed_attempt_timestamp = models.DateTimeField(null=True, blank=True) 
    
    def __str__(self):
        return f'{self.usuario.username} - {self.get_rol_display()}'

    def reset_failed_attempts(self):
        # Resetea los campos usados para la alerta
        self.failed_login_attempts_for_alert = 0
        self.last_failed_attempt_ip = None
        self.last_failed_attempt_timestamp = None
        self.save(update_fields=['failed_login_attempts_for_alert', 'last_failed_attempt_ip', 'last_failed_attempt_timestamp'])


# 🆕 NUEVO MODELO PARA HISTORIAL DE INTENTOS FALLIDOS
class FailedLoginAttempt(models.Model):
    """
    Registra cada intento fallido de autenticación para mostrar en el dashboard
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='failed_attempts',
        null=True,
        blank=True
    )
    username_attempted = models.CharField(max_length=150)
    ip_address = models.CharField(max_length=45)
    timestamp = models.DateTimeField(auto_now_add=True)
    user_agent = models.TextField(blank=True, null=True)
    acknowledged = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['acknowledged']),
        ]
    
    def __str__(self):
        return f"Intento fallido - {self.username_attempted} - {self.timestamp}"


def _sync_groups_for(user: User) -> None:
    """
    Mantiene los grupos básicos alineados con el rol del perfil y con is_superuser.
    """
    if not hasattr(user, 'perfil'):
        return

    admin_g, _ = Group.objects.get_or_create(name='Admin')
    emp_g, _   = Group.objects.get_or_create(name='Empleado')

    user.groups.remove(admin_g, emp_g)

    if user.is_superuser or user.perfil.rol == 'administrador':
        user.groups.add(admin_g)
        if not user.is_staff:
            user.is_staff = True
            user.save(update_fields=['is_staff'])
    else:
        user.groups.add(emp_g)

@receiver(post_save, sender=User)
def crear_o_sync_perfil(sender, instance: User, created: bool, **kwargs):
    """
    - Si el User es nuevo: crea Perfil.
    - Siempre sincroniza grupos tras guardar User.
    """
    if created:
        rol_inicial = 'administrador' if instance.is_superuser else 'empleado'
        Perfil.objects.create(usuario=instance, rol=rol_inicial)
    _sync_groups_for(instance)

@receiver(post_save, sender=Perfil)
def sync_groups_post_save(sender, instance: Perfil, **kwargs):
    """
    Si cambia el rol en Perfil, vuelve a sincronizar grupos y staff.
    """
    _sync_groups_for(instance.usuario)

    