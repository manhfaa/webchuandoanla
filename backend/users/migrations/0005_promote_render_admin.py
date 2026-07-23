from django.db import migrations


def skip_insecure_admin_bootstrap(apps, schema_editor):
    # Administrator credentials must never be embedded in a migration.
    # Use `manage.py provision_admin` with deployment environment variables.
    return None


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_alter_user_current_plan_user_plan_expires_at"),
    ]

    operations = [
        migrations.RunPython(skip_insecure_admin_bootstrap, migrations.RunPython.noop),
    ]
