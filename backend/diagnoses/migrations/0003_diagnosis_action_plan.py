from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("diagnoses", "0002_diagnosis_cnn_confidence_diagnosis_cnn_payload_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="diagnosis",
            name="action_plan",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
