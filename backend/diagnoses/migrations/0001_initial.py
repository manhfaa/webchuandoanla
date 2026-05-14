from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Diagnosis",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image_url", models.URLField(blank=True, default="")),
                ("image_path", models.CharField(blank=True, default="", max_length=500)),
                ("input_method", models.CharField(choices=[("upload", "Upload"), ("capture", "Capture"), ("sample", "Sample")], default="upload", max_length=20)),
                ("is_leaf", models.BooleanField(default=False)),
                ("yolo_confidence", models.FloatField(default=0.0)),
                ("plant_name", models.CharField(blank=True, default="", max_length=120)),
                ("disease_name", models.CharField(blank=True, default="", max_length=150)),
                ("severity", models.CharField(blank=True, default="", max_length=50)),
                ("note", models.TextField(blank=True, default="")),
                ("recommendations", models.JSONField(blank=True, default=list)),
                ("rag_summary", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="diagnoses", to="users.user")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
