import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction


class Command(BaseCommand):
    help = "Create or update an administrator from deployment environment variables."

    @transaction.atomic
    def handle(self, *args, **options):
        username = os.getenv("DJANGO_SUPERUSER_USERNAME", "").strip()
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "").strip().lower()
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "")

        configured = (username, email, password)
        if not any(configured):
            self.stdout.write("Administrator provisioning skipped: environment variables are not configured.")
            return
        if not all(configured):
            raise CommandError(
                "DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, and "
                "DJANGO_SUPERUSER_PASSWORD must be configured together."
            )

        try:
            validate_email(email)
        except ValidationError as exc:
            raise CommandError("DJANGO_SUPERUSER_EMAIL is invalid.") from exc

        User = get_user_model()
        by_username = User.objects.filter(username=username).first()
        by_email = User.objects.filter(email__iexact=email).first()
        if by_username and by_email and by_username.pk != by_email.pk:
            raise CommandError("Administrator username and email belong to different accounts.")

        user = by_username or by_email or User(username=username, email=email)
        user.username = username
        user.email = email
        user.full_name = user.full_name or "Quản trị Agromind AI"
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.current_plan = "elite"

        try:
            validate_password(password, user=user)
        except ValidationError as exc:
            raise CommandError("DJANGO_SUPERUSER_PASSWORD does not meet the password policy.") from exc

        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS("Administrator account provisioned securely."))
