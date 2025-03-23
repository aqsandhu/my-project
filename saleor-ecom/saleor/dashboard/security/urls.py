from django.conf.urls import url
from django.urls import path

from . import views

urlpatterns = [
    path('', views.security_dashboard, name='security-dashboard'),
    path('dashboard/', views.security_dashboard_data, name='security-dashboard-data'),
    path('events/', views.security_events_list, name='security-events-list'),
    path('events/export/', views.export_security_logs, name='security-events-export'),
    path('monitoring/', views.security_monitoring, name='security-monitoring'),
] 