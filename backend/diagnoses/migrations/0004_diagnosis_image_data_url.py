from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("diagnoses", "0003_diagnosis_action_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="diagnosis",
            name="image_data_url",
            field=models.TextField(blank=True, default=""),
        ),
    ]
