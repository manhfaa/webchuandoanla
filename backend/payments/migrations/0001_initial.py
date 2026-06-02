import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sepay_transaction_id", models.CharField(db_index=True, max_length=100, unique=True)),
                ("amount", models.IntegerField()),
                ("plan_requested", models.CharField(max_length=10)),
                ("old_plan", models.CharField(blank=True, max_length=10)),
                ("content", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Chờ thanh toán"),
                            ("success", "Thành công"),
                            ("underpaid", "Thiếu tiền"),
                            ("failed", "Thất bại"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("gateway", models.CharField(blank=True, max_length=50)),
                ("reference_number", models.CharField(blank=True, max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "payments",
                "ordering": ["-created_at"],
            },
        ),
    ]
