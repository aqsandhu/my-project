# Generated by Django 3.2.23 on 2024-01-19 14:02

import uuid
from decimal import Decimal

import django.contrib.postgres.indexes
import django.db.models.deletion
from django.db import migrations, models

import saleor.core.utils.json_serializer


class Migration(migrations.Migration):
    dependencies = [
        ("checkout", "0063_checkout_base_total_and_subtotal"),
        ("discount", "0073_auto_20231213_1535"),
    ]

    operations = [
        migrations.AddField(
            model_name="promotion",
            name="type",
            field=models.CharField(
                choices=[("catalogue", "Catalogue"), ("order", "Order")],
                default="catalogue",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="promotionrule",
            name="order_predicate",
            field=models.JSONField(
                blank=True,
                default=dict,
                encoder=saleor.core.utils.json_serializer.CustomJsonEncoder,
            ),
        ),
        migrations.AddField(
            model_name="promotionrule",
            name="reward_type",
            field=models.CharField(
                blank=True,
                choices=[("subtotal_discount", "subtotal_discount")],
                max_length=255,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="checkoutlinediscount",
            name="type",
            field=models.CharField(
                choices=[
                    ("sale", "Sale"),
                    ("voucher", "Voucher"),
                    ("manual", "Manual"),
                    ("promotion", "Promotion"),
                    ("order_promotion", "Order promotion"),
                ],
                default="manual",
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="orderdiscount",
            name="type",
            field=models.CharField(
                choices=[
                    ("sale", "Sale"),
                    ("voucher", "Voucher"),
                    ("manual", "Manual"),
                    ("promotion", "Promotion"),
                    ("order_promotion", "Order promotion"),
                ],
                default="manual",
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="orderlinediscount",
            name="type",
            field=models.CharField(
                choices=[
                    ("sale", "Sale"),
                    ("voucher", "Voucher"),
                    ("manual", "Manual"),
                    ("promotion", "Promotion"),
                    ("order_promotion", "Order promotion"),
                ],
                default="manual",
                max_length=64,
            ),
        ),
        migrations.CreateModel(
            name="CheckoutDiscount",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("sale", "Sale"),
                            ("voucher", "Voucher"),
                            ("manual", "Manual"),
                            ("promotion", "Promotion"),
                            ("order_promotion", "Order promotion"),
                        ],
                        default="manual",
                        max_length=64,
                    ),
                ),
                (
                    "value_type",
                    models.CharField(
                        choices=[("fixed", "fixed"), ("percentage", "%")],
                        default="fixed",
                        max_length=10,
                    ),
                ),
                (
                    "value",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("0.0"), max_digits=12
                    ),
                ),
                (
                    "amount_value",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("0.0"), max_digits=12
                    ),
                ),
                ("currency", models.CharField(max_length=3)),
                ("name", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "translated_name",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("reason", models.TextField(blank=True, null=True)),
                (
                    "voucher_code",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "checkout",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="discounts",
                        to="checkout.checkout",
                    ),
                ),
                (
                    "promotion_rule",
                    models.ForeignKey(
                        blank=True,
                        db_index=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="discount.promotionrule",
                    ),
                ),
                (
                    "voucher",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="discount.voucher",
                    ),
                ),
            ],
            options={
                "ordering": ("created_at", "id"),
            },
        ),
        # nosemgrep: add-index-concurrently
        migrations.AddIndex(
            model_name="checkoutdiscount",
            index=django.contrib.postgres.indexes.BTreeIndex(
                fields=["promotion_rule"], name="checkoutdiscount_rule_idx"
            ),
        ),
        # nosemgrep: add-index-concurrently
        migrations.AddIndex(
            model_name="checkoutdiscount",
            index=django.contrib.postgres.indexes.GinIndex(
                fields=["name", "translated_name"], name="discount_ch_name_64e096_gin"
            ),
        ),
        # nosemgrep: add-index-concurrently
        migrations.AddIndex(
            model_name="checkoutdiscount",
            index=django.contrib.postgres.indexes.GinIndex(
                fields=["voucher_code"], name="checkoutdiscount_voucher_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="checkoutdiscount",
            unique_together={("checkout_id", "promotion_rule_id")},
        ),
        migrations.RunSQL(
            "ALTER TABLE discount_promotionrule ALTER COLUMN order_predicate SET DEFAULT '{}';",
            migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            "ALTER TABLE discount_promotion ALTER COLUMN type SET DEFAULT 'catalogue';",
            migrations.RunSQL.noop,
        ),
    ]
