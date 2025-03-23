# Generated by Django 2.2.9 on 2020-02-04 13:22

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("warehouse", "0004_auto_20200129_0717"),
    ]

    operations = [
        migrations.AlterField(
            model_name="warehouse",
            name="shipping_zones",
            field=models.ManyToManyField(
                blank=True, related_name="warehouses", to="shipping.ShippingZone"
            ),
        ),
    ]
