from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import UserSetting
from .serializers import (
    EmailTokenSerializer,
    RegisterSerializer,
    UserSerializer,
    UserSettingSerializer,
)


class RegisterAPIView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginAPIView(TokenObtainPairView):
    serializer_class = EmailTokenSerializer
    permission_classes = [permissions.AllowAny]


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserSettingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, user):
        setting, _ = UserSetting.objects.get_or_create(user=user)
        return setting

    def get(self, request):
        settings_obj = self.get_object(request.user)
        return Response(UserSettingSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj = self.get_object(request.user)
        serializer = UserSettingSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
