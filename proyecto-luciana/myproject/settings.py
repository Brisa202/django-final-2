from pathlib import Path
from datetime import timedelta
import os  # 👈 agregar esto

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-yuk4=_f&$ikl8n9fq)t@sr(56f1d=z8g@0zc96egh4=8z^3w@6'
DEBUG = True
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'incidentes.apps.IncidentesConfig',

    # 3rd party
    'rest_framework',
    'corsheaders',

    # apps
    'accounts',
    'empleados',
    'dashboard',
    'productos',
    'alquileres',
    'clientes',
    'pedidos',
    'entregas',
    'pagos',
    'caja',

]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    # CORS antes de CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'myproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'myproject.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'proyecto_hollywood',
        'USER': 'root',
        'PASSWORD': 'brisa123456789',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}

# --- DRF + JWT ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# --- Internacionalización ---
LANGUAGE_CODE = 'es-ar'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True

# --- Static ---
STATIC_URL = 'static/'

# 👇👇 ESTO ES NUEVO 👇👇
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# esto hace que los ImageField (por ej comprobantes/senia/archivo.png)
# se guarden físicamente en <tu_proyecto>/media/... y se sirvan via
# http://localhost:8000/media/...

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- CORS para tu React local ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "auth-rate-limit",
    }
}
QR_BASE = 'http://192.168.100.60:3000';
