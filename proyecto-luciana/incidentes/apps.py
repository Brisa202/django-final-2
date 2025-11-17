# incidentes/apps.py
from django.apps import AppConfig

class IncidentesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'incidentes'

    def ready(self):
        # Registra los receivers de señales al iniciar la app
        from . import signals  # noqa: F401
