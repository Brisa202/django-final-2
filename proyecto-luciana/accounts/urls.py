# accounts/urls.py
from django.urls import path
from .views import (
    LoginAPIView, 
    PerfilUsuarioAPIView,
    FailedLoginAttemptsAPIView,
    FailedLoginHistoryAPIView
)
from .auth import EmailOrUsernameTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='login'),
    path('perfil/', PerfilUsuarioAPIView.as_view(), name='perfil-usuario'),
    path('token/', EmailOrUsernameTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Endpoints para intentos fallidos
    path('failed-attempts/', FailedLoginAttemptsAPIView.as_view(), name='failed-attempts'),
    path('failed-attempts/history/', FailedLoginHistoryAPIView.as_view(), name='failed-attempts-history'),
]
