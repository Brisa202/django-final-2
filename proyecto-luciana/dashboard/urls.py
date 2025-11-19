from django.urls import path
from .views import (
    MetricsSummaryView, 
    RecentActivityView,
    MetricsChartView,
    PaymentDistributionView,
    PaymentsFlowChartView,      # 👈 nombre correcto de la vista
    DashboardStatsExtendedView,
)

urlpatterns = [
    # Endpoints principales
    path('metrics/summary/', MetricsSummaryView.as_view(), name='metrics-summary'),
    path('activity/recent/', RecentActivityView.as_view(), name='activity-recent'),
    
    # Endpoints para gráficos
    path('metrics/chart/', MetricsChartView.as_view(), name='metrics-chart'),
    path('metrics/payment-distribution/', PaymentDistributionView.as_view(), name='payment-distribution'),
    path('metrics/payments-flow/', PaymentsFlowChartView.as_view(), name='payments-flow'),  # 👈 usado acá también

    # Estadísticas extendidas
    path('metrics/extended/', DashboardStatsExtendedView.as_view(), name='metrics-extended'),
]

