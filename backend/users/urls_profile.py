from django.urls import path

from .views import MeAPIView, UserSettingAPIView

urlpatterns = [
    path("me/", MeAPIView.as_view(), name="me"),
    path("settings/", UserSettingAPIView.as_view(), name="settings"),
]
