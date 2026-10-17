import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0008_user_terms_accepted_at_user_terms_version_and_more")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="EmailVerificationToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token_hash", models.CharField(max_length=64, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="email_verification_tokens", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="RegistrationAttempt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("ip_hash", models.CharField(db_index=True, max_length=64)),
                ("agent_hash", models.CharField(db_index=True, max_length=64)),
                ("email_pattern_hash", models.CharField(db_index=True, max_length=64)),
                ("outcome", models.CharField(max_length=24)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["ip_hash", "created_at"], name="users_regis_ip_hash_c7f624_idx"),
                    models.Index(fields=["agent_hash", "created_at"], name="users_regis_agent_h_338fad_idx"),
                    models.Index(fields=["email_pattern_hash", "created_at"], name="users_regis_email_p_1b28e4_idx"),
                ],
            },
        ),
    ]
