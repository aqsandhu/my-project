# Generated by Django 3.2.2 on 2021-06-17 16:50

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("discount", "0025_auto_20210506_0831"),
    ]

    operations = [
        migrations.AddField(
            model_name="voucher",
            name="only_for_staff",
            field=models.BooleanField(default=False),
        ),
    ]
