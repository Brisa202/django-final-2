# clientes/serializers.py
from rest_framework import serializers
from .models import Cliente
import re


# ===== Helpers de validación (mismo criterio que tu frontend) =====

def validar_dni(dni: str) -> bool:
    """DNI de 7-8 dígitos."""
    return bool(re.fullmatch(r"\d{7,8}", dni or ""))


def validar_cuit(cuit: str) -> bool:
    """CUIT de 11 dígitos con módulo 11."""
    if not re.fullmatch(r"\d{11}", cuit or ""):
        return False

    multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    nums = [int(d) for d in cuit]
    s = sum(a * b for a, b in zip(nums[:10], multipliers))
    mod = s % 11
    verificador = 0 if mod == 0 else 9 if mod == 1 else 11 - mod
    return verificador == nums[10]


def validar_nombre(valor: str) -> bool:
    """Solo letras, espacios, acentos, ñ, guiones. 2–50 caracteres."""
    if not valor:
        return False
    valor = valor.strip()
    if not (2 <= len(valor) <= 50):
        return False
    return bool(re.fullmatch(r"[a-záéíóúñü\s\-]+", valor, flags=re.I))


def validar_calle(valor: str) -> bool:
    """Calle tipo 'Av. Córdoba', '9 de Julio', etc."""
    if not valor:
        return False
    valor = valor.strip()
    if len(valor) < 3 or len(valor) > 100:
        return False
    return bool(re.fullmatch(r"[0-9a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-]+", valor))


def validar_numero_calle(valor: str) -> bool:
    if not valor:
        return False
    valor = valor.strip()
    if len(valor) > 10:
        return False
    return bool(re.fullmatch(r"[0-9a-zA-Z\s\/\-]+", valor))


def validar_telefono_ar(valor: str) -> bool:
    """
    Soporta:
      - Nacional: 10 dígitos (ej. 11xxxxxxxx, 3xxxxxxxxx, etc.)
      - Internacional: 54 + 10/11 dígitos (ej. 54 9 11 xxxx xxxx)
    """
    if not valor:
        return False

    nums = re.sub(r"\D", "", valor)

    # +54... (con o sin 9)
    if nums.startswith("54") and 12 <= len(nums) <= 13:
        return True

    # 10 dígitos nacionales
    if len(nums) == 10 and (nums.startswith("11") or nums.startswith("2") or nums.startswith("3")):
        return True

    return False


class ClienteSerializer(serializers.ModelSerializer):
    """
    Serializer mejorado para Cliente:
    - Valida nombre, apellido, documento, teléfono, email y notas.
    - Expone campos extras de solo lectura:
        * nombre_completo
        * direccion_calle
        * direccion_numero
    """
    nombre_completo = serializers.SerializerMethodField(read_only=True)
    direccion_calle = serializers.SerializerMethodField(read_only=True)
    direccion_numero = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Cliente
        # Incluimos todos los campos del modelo + extras de solo lectura
        fields = [
            "id",
            "nombre",
            "apellido",
            "documento",
            "telefono",
            "email",
            "direccion",
            "notas",
            "activo",
            "creado_en",
            # extras
            "nombre_completo",
            "direccion_calle",
            "direccion_numero",
        ]
        read_only_fields = (
            "creado_en",
            "nombre_completo",
            "direccion_calle",
            "direccion_numero",
        )

    # ---------- Getters de campos calculados ----------

    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}".strip()

    def get_direccion_calle(self, obj):
        """
        Rompe 'Av. Córdoba 1234' en 'Av. Córdoba' + '1234' solo para leer.
        El formulario ya manda direccion armada, así que no tocamos el modelo.
        """
        if not obj.direccion:
            return ""
        parts = obj.direccion.strip().split()
        if len(parts) < 2:
            return obj.direccion.strip()
        # último "token" lo tomamos como número
        return " ".join(parts[:-1])

    def get_direccion_numero(self, obj):
        if not obj.direccion:
            return ""
        parts = obj.direccion.strip().split()
        if len(parts) < 2:
            return ""
        return parts[-1]

    # ---------- Validaciones de campos individuales ----------

    def validate_nombre(self, value):
        if not validar_nombre(value):
            raise serializers.ValidationError(
                "El nombre es obligatorio y solo debe contener letras (2–50 caracteres)."
            )
        return value.strip()

    def validate_apellido(self, value):
        if not validar_nombre(value):
            raise serializers.ValidationError(
                "El apellido es obligatorio y solo debe contener letras (2–50 caracteres)."
            )
        return value.strip()

    def validate_documento(self, value):
        value = (value or "").strip()
        if not value:
            # El front ya lo obliga, pero no rompemos si viene vacío.
            return value

        if not value.isdigit():
            raise serializers.ValidationError(
                "El documento debe contener solo números (DNI 7–8 dígitos o CUIT 11 dígitos)."
            )

        if len(value) in (7, 8):
            if not validar_dni(value):
                raise serializers.ValidationError("DNI inválido. Debe tener 7–8 dígitos numéricos.")
        elif len(value) == 11:
            if not validar_cuit(value):
                raise serializers.ValidationError("CUIT inválido. El dígito verificador no es correcto.")
        else:
            raise serializers.ValidationError(
                "Debe ser un DNI (7–8 dígitos) o un CUIT válido de 11 dígitos."
            )

        return value

    def validate_telefono(self, value):
        value = value or ""
        if not value.strip():
            return value  # dejamos vacío si se mandó así

        if not validar_telefono_ar(value):
            raise serializers.ValidationError(
                "Teléfono inválido. Usá un formato argentino válido (ej: 11 1234 5678 o +54 9 11 1234 5678)."
            )
        return value

    def validate_email(self, value):
        value = (value or "").strip()
        if not value:
            return value
        # EmailField ya valida formato, solo normalizamos
        return value.lower()

    def validate_notas(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Las notas no pueden superar los 500 caracteres.")
        return value

    def validate_direccion(self, value):
        """
        El front ya arma 'calle numero', pero verificamos que al menos
        se parezca a algo razonable (opcional).
        """
        value = (value or "").strip()
        if not value:
            return value

        parts = value.split()
        if len(parts) >= 2:
            calle = " ".join(parts[:-1])
            numero = parts[-1]
            if not validar_calle(calle) or not validar_numero_calle(numero):
                raise serializers.ValidationError(
                    "Dirección inválida. Revisá calle y número (ej: 'Av. Córdoba 1234')."
                )

        return value

