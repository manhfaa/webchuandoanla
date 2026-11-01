"""Keep developer billing tables private from Supabase's public API roles."""

from django.db import migrations


def restrict_tables(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    model_names = (
        "DeveloperOrganization", "DeveloperAPIKey", "ApiWallet", "ApiUsage",
        "ApiLedgerEntry", "ApiTopUpOrder", "ApiTopUpTransfer", "ApiTopUpReconciliation",
    )
    quote = schema_editor.quote_name
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')")
        roles = [row[0] for row in cursor.fetchall()]
        for model_name in model_names:
            table = quote(apps.get_model("developer_api", model_name)._meta.db_table)
            cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            cursor.execute(f"REVOKE ALL PRIVILEGES ON TABLE {table} FROM PUBLIC")
            for role in roles:
                cursor.execute(f"REVOKE ALL PRIVILEGES ON TABLE {table} FROM {quote(role)}")


class Migration(migrations.Migration):
    dependencies = [("developer_api", "0006_reconciliation_multiple")]
    operations = [migrations.RunPython(restrict_tables, migrations.RunPython.noop)]
