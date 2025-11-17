# caja/models.py
from django.db import models
from django.utils import timezone
from django.db.models import Sum, Q
from django.contrib.auth.models import User
from decimal import Decimal


class Caja(models.Model):
    ESTADO_CHOICES = [
        ('ABIERTA', 'Abierta'),
        ('CERRADA', 'Cerrada'),
    ]
    
    id_caja = models.AutoField(primary_key=True)
    
    # Quién abre y cierra la caja
    usuario_apertura = models.ForeignKey(User, on_delete=models.PROTECT, related_name='cajas_abiertas')
    usuario_cierre = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cajas_cerradas')
    
    # Empleado/Cajero a cargo de la caja
    empleado = models.ForeignKey(
        'empleados.Empleado',
        on_delete=models.PROTECT,
        related_name='cajas',
        help_text="Cajero/Empleado a cargo de esta caja"
    )
    
    fecha_apertura = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='ABIERTA')
    
    # Dinero inicial al abrir (arqueo inicial)
    monto_inicial_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Dinero en efectivo al abrir")
    monto_inicial_transferencia = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Dinero en banco/transferencias al abrir")
    
    # Resumen final al cerrar (arqueo final)
    monto_final_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    monto_final_transferencia = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    
    # Diferencias/discrepancias
    diferencia_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    diferencia_transferencia = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    
    # Observaciones
    notas_apertura = models.TextField(blank=True)
    notas_cierre = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-fecha_apertura']
        verbose_name = 'Caja'
        verbose_name_plural = 'Cajas'
    
    def __str__(self):
        return f"Caja #{self.id_caja} - {self.estado} ({self.fecha_apertura.strftime('%d/%m/%Y %H:%M')})"
    
    # INGRESOS
    def obtener_ingresos_efectivo(self):
        """Suma todos los ingresos en EFECTIVO"""
        from pagos.models import Pago
        return Pago.objects.filter(
            caja=self,
            sentido='INGRESO',
            metodo_pago='EFECTIVO'
        ).aggregate(total=Sum('monto'))['total'] or Decimal(0)
    
    def obtener_ingresos_transferencia(self):
        """Suma todos los ingresos en TRANSFERENCIA"""
        from pagos.models import Pago
        return Pago.objects.filter(
            caja=self,
            sentido='INGRESO',
            metodo_pago='TRANSFERENCIA'
        ).aggregate(total=Sum('monto'))['total'] or Decimal(0)
    
    def obtener_total_ingresos(self):
        """Total de ingresos"""
        return self.obtener_ingresos_efectivo() + self.obtener_ingresos_transferencia()
    
    # EGRESOS
    def obtener_egresos_efectivo(self):
        """Suma todos los egresos en EFECTIVO"""
        from pagos.models import Pago
        return Pago.objects.filter(
            caja=self,
            sentido='EGRESO',
            metodo_pago='EFECTIVO'
        ).aggregate(total=Sum('monto'))['total'] or Decimal(0)
    
    def obtener_egresos_transferencia(self):
        """Suma todos los egresos en TRANSFERENCIA"""
        from pagos.models import Pago
        return Pago.objects.filter(
            caja=self,
            sentido='EGRESO',
            metodo_pago='TRANSFERENCIA'
        ).aggregate(total=Sum('monto'))['total'] or Decimal(0)
    
    def obtener_total_egresos(self):
        """Total de egresos"""
        return self.obtener_egresos_efectivo() + self.obtener_egresos_transferencia()
    
    # BALANCES
    def obtener_balance_efectivo_teorico(self):
        """Balance teórico de efectivo: inicial + ingresos - egresos"""
        return (self.monto_inicial_efectivo + 
                self.obtener_ingresos_efectivo() - 
                self.obtener_egresos_efectivo())
    
    def obtener_balance_transferencia_teorico(self):
        """Balance teórico de transferencias"""
        return (self.monto_inicial_transferencia + 
                self.obtener_ingresos_transferencia() - 
                self.obtener_egresos_transferencia())
    
    def obtener_balance_total_teorico(self):
        """Balance teórico total"""
        return (self.obtener_balance_efectivo_teorico() + 
                self.obtener_balance_transferencia_teorico())
    
    def obtener_pagos(self):
        """Todos los pagos de esta caja"""
        from pagos.models import Pago
        return Pago.objects.filter(caja=self).order_by('-fecha_pago')
    
    def puede_cerrarse(self):
        """Valida si la caja puede cerrarse"""
        return self.estado == 'ABIERTA'
    
    def cerrar(self, usuario, monto_final_efectivo, monto_final_transferencia, notas=''):
        """Cierra la caja con arqueo final"""
        if not self.puede_cerrarse():
            raise ValueError("La caja no puede cerrarse - ya está cerrada")
        
        # CORRECCIÓN: Convertir a Decimal para evitar error de tipos
        monto_final_efectivo = Decimal(str(monto_final_efectivo))
        monto_final_transferencia = Decimal(str(monto_final_transferencia))
        
        self.usuario_cierre = usuario
        self.fecha_cierre = timezone.now()
        self.estado = 'CERRADA'
        
        # Arqueo final
        self.monto_final_efectivo = monto_final_efectivo
        self.monto_final_transferencia = monto_final_transferencia
        
        # Calcular diferencias
        self.diferencia_efectivo = (monto_final_efectivo - 
                                   self.obtener_balance_efectivo_teorico())
        self.diferencia_transferencia = (monto_final_transferencia - 
                                        self.obtener_balance_transferencia_teorico())
        
        self.notas_cierre = notas
        self.save()
        
        # Registrar movimiento en historial
        HistorialCaja.objects.create(
            caja=self,
            tipo_evento='CIERRE',
            descripcion=f'Caja cerrada por {usuario.username}',
            usuario=usuario,
            detalles={
                'monto_final_efectivo': str(monto_final_efectivo),
                'monto_final_transferencia': str(monto_final_transferencia),
                'diferencia_efectivo': str(self.diferencia_efectivo),
                'diferencia_transferencia': str(self.diferencia_transferencia),
            }
        )


class HistorialCaja(models.Model):
    """Registro de eventos importantes de la caja"""
    TIPO_EVENTO_CHOICES = [
        ('APERTURA', 'Apertura de caja'),
        ('CIERRE', 'Cierre de caja'),
        ('PAGO_REGISTRADO', 'Pago registrado'),
        ('AJUSTE', 'Ajuste manual'),
        ('NOTA', 'Nota/Observación'),
    ]
    
    id_evento = models.AutoField(primary_key=True)
    caja = models.ForeignKey(Caja, on_delete=models.CASCADE, related_name='historial')
    tipo_evento = models.CharField(max_length=20, choices=TIPO_EVENTO_CHOICES)
    descripcion = models.TextField()
    detalles = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.get_tipo_evento_display()} - {self.timestamp}"
