from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("developer_api", "0005_apitopupreconciliation")]

    operations = [
        migrations.AlterField(
            model_name="apitopupreconciliation",
            name="order",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="reconciliations", to="developer_api.apitopuporder"),
        ),
    ]
