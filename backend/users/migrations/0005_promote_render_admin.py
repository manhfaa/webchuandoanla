from django.db import migrations
from django.contrib.auth.hashers import make_password


ADMIN_EMAIL = "admin@agromindai.vn"
ADMIN_PASSWORD = "Admin@12345"


def promote_render_admin(apps, schema_editor):
    User = apps.get_model("users", "User")

    user = User.objects.filter(email__iexact=ADMIN_EMAIL).first()
    if user is None:
        user = User.objects.filter(username="admin").first()
    if user is None:
        username = "admin"
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f"admin_{suffix}"
            suffix += 1
        user = User(username=username, email=ADMIN_EMAIL)

    user.username = "admin"
    user.full_name = "Admin Agromind AI"

    user.email = ADMIN_EMAIL
    user.password = make_password(ADMIN_PASSWORD)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.current_plan = "elite"
    user.save()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_alter_user_current_plan_user_plan_expires_at"),
    ]

    operations = [
        migrations.RunPython(promote_render_admin, migrations.RunPython.noop),
    ]
