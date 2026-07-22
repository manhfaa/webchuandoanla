from rest_framework_simplejwt.authentication import JWTAuthentication

from payments.services import expire_user_plan


class ExpiringJWTAuthentication(JWTAuthentication):
    """Keep the persisted plan in sync before an authenticated request runs."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        expire_user_plan(user)
        return user
