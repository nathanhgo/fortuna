import rooms.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="player",
            name="avatar",
            field=models.CharField(
                choices=[
                    ("owl", "owl"),
                    ("laurel", "laurel"),
                    ("lyre", "lyre"),
                    ("column", "column"),
                    ("sun", "sun"),
                    ("trident", "trident"),
                    ("mask", "mask"),
                    ("cornucopia", "cornucopia"),
                ],
                default=rooms.models.pick_avatar,
                max_length=16,
            ),
        ),
    ]
