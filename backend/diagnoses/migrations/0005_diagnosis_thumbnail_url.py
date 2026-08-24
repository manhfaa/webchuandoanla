from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("diagnoses", "0004_diagnosis_image_data_url")]

    operations = [
        migrations.AddField(
            model_name="diagnosis",
            name="thumbnail_url",
            field=models.TextField(blank=True, default=""),
        ),
    ]
