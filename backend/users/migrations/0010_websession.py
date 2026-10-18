import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0009_registration_verification")]

    operations = [
        migrations.CreateModel(
            name="WebSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("access_hash", models.CharField(max_length=64, unique=True)),
                ("refresh_hash", models.CharField(max_length=64, unique=True)),
                ("access_expires_at", models.DateTimeField()),
                ("refresh_expires_at", models.DateTimeField(db_index=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="web_sessions", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
