# Generated by Django 3.2.20 on 2023-10-02 06:32

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("discount", "0066_clear_voucher_and_vouchercustomer"),
    ]

    operations = [
        migrations.AddField(
            model_name="voucher",
            name="single_use",
            field=models.BooleanField(default=False),
        ),
        migrations.RunSQL(
            """
                ALTER TABLE discount_voucher
                ALTER COLUMN single_use
                SET DEFAULT false;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
