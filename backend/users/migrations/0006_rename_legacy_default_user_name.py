from django.db import migrations, models


LEGACY_DEFAULT_NAME = "Người dùng Leafiq"
DEFAULT_NAME = "Người dùng AgromindAI"


def rename_legacy_default_user_names(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(full_name=LEGACY_DEFAULT_NAME).update(full_name=DEFAULT_NAME)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_promote_render_admin"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="full_name",
            field=models.CharField(blank=True, default=DEFAULT_NAME, max_length=120),
        ),
        migrations.RunPython(rename_legacy_default_user_names, migrations.RunPython.noop),
    ]
