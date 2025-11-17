from datetime import date
from django.db import transaction, IntegrityError
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.contrib.auth.password_validation import validate_password  # ← NUEVO

from .models import Empleado
from accounts.models import Perfil


# ===== Usuario (lite) =====
class UsuarioLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


# ===== Empleado (list/retrieve) =====
class EmpleadoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    usuario = UsuarioLiteSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='usuario', write_only=True, required=False
    )
    rol = serializers.SerializerMethodField()
    rol_display = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = (
            'id',
            'id_empleados',
            'usuario', 'user_id',
            'nombre', 'apellido', 'dni', 'telefono',
            'fecha_ingreso', 'fecha_egreso',
            'direccion', 'activo',
            'rol', 'rol_display',
        )
        read_only_fields = ('id', 'id_empleados', 'rol', 'rol_display')

    def get_rol(self, obj):
        perfil = getattr(obj.usuario, 'perfil', None)
        return getattr(perfil, 'rol', None)

    def get_rol_display(self, obj):
        perfil = getattr(obj.usuario, 'perfil', None)
        return perfil.get_rol_display() if perfil else None


# ===== Alta (User + Perfil + Empleado) =====
class UsuarioCreacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, v):
        if User.objects.filter(username=v).exists():
            raise serializers.ValidationError("El username ya está en uso.")
        return v

    def validate_email(self, v):
        if v and User.objects.filter(email=v).exists():
            raise serializers.ValidationError("El email ya está en uso.")
        return v
    
    # ✨ NUEVO: Validación de contraseña segura
    def validate_password(self, v):
        """
        Valida que la contraseña cumpla con los requisitos de seguridad de Django.
        Esto protege contra contraseñas débiles incluso si alguien bypasea el frontend.
        """
        try:
            validate_password(v)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return v


class EmpleadoCreacionSerializer(serializers.Serializer):
    # Credenciales del usuario
    datos_usuario = UsuarioCreacionSerializer()

    # Datos del empleado
    nombre        = serializers.CharField(max_length=100)
    apellido      = serializers.CharField(max_length=100)
    dni           = serializers.CharField(max_length=20, required=True, allow_blank=False)
    telefono      = serializers.CharField(max_length=20, required=False, allow_blank=True)

    fecha_ingreso = serializers.DateField(
        format="%Y-%m-%d", input_formats=["%Y-%m-%d"],
        required=False, allow_null=True
    )
    fecha_egreso  = serializers.DateField(
        format="%Y-%m-%d", input_formats=["%Y-%m-%d"],
        required=False, allow_null=True
    )
    direccion     = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # rol del perfil
    rol_asignado  = serializers.ChoiceField(choices=Perfil.ROLES_CHOICES)

    # ---- validaciones campo a campo ----
    def validate_dni(self, v):
        v = (v or '').strip()
        if not v:
            raise serializers.ValidationError("El DNI es obligatorio.")
        if not v.isdigit() or not (6 <= len(v) <= 12):
            raise serializers.ValidationError("DNI inválido (solo números, 6–12 dígitos).")
        if Empleado.objects.filter(dni=v).exists():
            raise serializers.ValidationError("Este DNI ya está registrado.")
        return v

    def validate_telefono(self, v):
        # Limpiar el teléfono de espacios y caracteres de formato
        if v:
            v_clean = v.replace(' ', '').replace('+', '').replace('-', '')
            if not v_clean.isdigit() or len(v_clean) < 6:
                raise serializers.ValidationError("Teléfono inválido.")
        return v

    # ---- validación cruzada ----
    def validate(self, data):
        fi = data.get('fecha_ingreso')
        fe = data.get('fecha_egreso')
        if fe and fi and fe < fi:
            raise serializers.ValidationError({"fecha_egreso": "No puede ser anterior a la fecha de ingreso."})
        return data

    def to_representation(self, instance: Empleado):
        return EmpleadoSerializer(instance).data

    @transaction.atomic
    def create(self, validated_data):
        datos_usuario = validated_data.pop('datos_usuario')
        rol_asignado  = validated_data.pop('rol_asignado')

        # 1) User
        usuario = User.objects.create_user(
            username=datos_usuario['username'],
            email=datos_usuario.get('email', ''),
            password=datos_usuario['password']
        )

        # 2) Perfil + grupos
        perfil: Perfil = usuario.perfil  # creado por signal
        perfil.rol = rol_asignado
        perfil.save()

        try:
            if str(rol_asignado).lower() == 'administrador':
                admin_group, _ = Group.objects.get_or_create(name='Admin')
                usuario.groups.add(admin_group)
                if not usuario.is_staff:
                    usuario.is_staff = True
                    usuario.save(update_fields=['is_staff'])
            else:
                empleado_group, _ = Group.objects.get_or_create(name='Empleado')
                usuario.groups.add(empleado_group)
        except Exception:
            pass  # no cortamos la transacción por esto

        # 3) Empleado (fecha_ingreso por defecto = hoy)
        fi = validated_data.pop('fecha_ingreso', None) or date.today()
        try:
            empleado = Empleado.objects.create(usuario=usuario, fecha_ingreso=fi, **validated_data)
        except IntegrityError:
            # carrera de unicidad DNI
            raise serializers.ValidationError({'dni': 'Este DNI ya está registrado.'})
        return empleado


# ===== Update (Empleado + cambio de rol en Perfil) =====
class EmpleadoUpdateSerializer(serializers.ModelSerializer):
    rol_cambio = serializers.ChoiceField(choices=Perfil.ROLES_CHOICES, required=False, allow_null=True)

    class Meta:
        model = Empleado
        fields = (
            'nombre', 'apellido', 'dni', 'telefono',
            'fecha_ingreso', 'fecha_egreso', 'direccion', 'activo',
            'rol_cambio',
        )

    def validate_dni(self, v):
        v = (v or '').strip()
        if not v:
            raise serializers.ValidationError("El DNI es obligatorio.")
        if not v.isdigit() or not (6 <= len(v) <= 12):
            raise serializers.ValidationError("DNI inválido (solo números, 6–12 dígitos).")
        if Empleado.objects.filter(dni=v).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Este DNI ya está registrado.")
        return v

    def validate_telefono(self, v):
        # Limpiar el teléfono de espacios y caracteres de formato
        if v:
            v_clean = v.replace(' ', '').replace('+', '').replace('-', '')
            if not v_clean.isdigit() or len(v_clean) < 6:
                raise serializers.ValidationError("Teléfono inválido.")
        return v

    def validate(self, data):
        fi = data.get('fecha_ingreso', getattr(self.instance, 'fecha_ingreso', None))
        fe = data.get('fecha_egreso', getattr(self.instance, 'fecha_egreso', None))
        if fe and fi and fe < fi:
            raise serializers.ValidationError({"fecha_egreso": "No puede ser anterior a la fecha de ingreso."})
        return data

    def to_representation(self, instance):
        return EmpleadoSerializer(instance).data

    @transaction.atomic
    def update(self, instance, validated_data):
        rol_cambio = validated_data.pop('rol_cambio', None)

        if rol_cambio is not None:
            perfil = getattr(instance.usuario, 'perfil', None)
            if perfil:
                perfil.rol = rol_cambio
                perfil.save()
                try:
                    admin_g, _ = Group.objects.get_or_create(name='Admin')
                    emp_g, _   = Group.objects.get_or_create(name='Empleado')
                    u = instance.usuario
                    u.groups.remove(admin_g, emp_g)
                    if rol_cambio == 'administrador' or u.is_superuser:
                        u.groups.add(admin_g)
                        if not u.is_staff:
                            u.is_staff = True
                            u.save(update_fields=['is_staff'])
                    else:
                        u.groups.add(emp_g)
                except Exception:
                    pass

        try:
            for k, v in validated_data.items():
                setattr(instance, k, v)
            instance.save()
            return instance
        except IntegrityError:
            raise serializers.ValidationError({'dni': 'Este DNI ya está registrado.'})
