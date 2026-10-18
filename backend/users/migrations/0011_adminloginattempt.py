from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0010_websession")]

    operations = [
        migrations.CreateModel(
            name="AdminLoginAttempt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ip_hash", models.CharField(max_length=64)),
                ("account_hash", models.CharField(max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["ip_hash", "created_at"], name="admin_ip_time_idx"),
                    models.Index(fields=["account_hash", "created_at"], name="admin_account_time_idx"),
                ],
            },
        ),
    ]
