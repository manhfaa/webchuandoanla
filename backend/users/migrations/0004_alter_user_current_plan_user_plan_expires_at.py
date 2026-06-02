from django.db import migrations, models


def migrate_plans(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(current_plan="free").update(current_plan="seed")
    User.objects.filter(current_plan="pro").update(current_plan="grow")
    User.objects.filter(current_plan="plus").update(current_plan="bloom")


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_alter_user_full_name_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="plan_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="current_plan",
            field=models.CharField(
                choices=[
                    ("seed", "Seed"),
                    ("grow", "Grow"),
                    ("bloom", "Bloom"),
                    ("elite", "Elite"),
                ],
                default="seed",
                max_length=10,
            ),
        ),
        migrations.RunPython(migrate_plans, migrations.RunPython.noop),
    ]
