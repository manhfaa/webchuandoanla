from django.core.management.base import BaseCommand, CommandError

from diagnoses.models import Diagnosis
from diagnoses.thumbnails import build_thumbnail_url


class Command(BaseCommand):
    help = "Generate missing diagnosis thumbnails in bounded batches."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=5)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if not 1 <= batch_size <= 100:
            raise CommandError("batch-size must be between 1 and 100")

        last_id = 0
        updated = 0
        skipped = 0
        while True:
            rows = list(
                Diagnosis.objects.filter(id__gt=last_id, thumbnail_url="")
                .order_by("id")
                .values_list("id", "image_data_url", "image_url")[:batch_size]
            )
            if not rows:
                break

            thumbnails = []
            for pk, image_data_url, image_url in rows:
                thumbnail_url = build_thumbnail_url(image_data_url) if image_data_url else image_url
                if thumbnail_url:
                    thumbnails.append(Diagnosis(id=pk, thumbnail_url=thumbnail_url))
                else:
                    skipped += 1

            if thumbnails:
                Diagnosis.objects.bulk_update(thumbnails, ["thumbnail_url"], batch_size=batch_size)
                updated += len(thumbnails)
            last_id = rows[-1][0]

        self.stdout.write(f"Updated {updated} thumbnails; skipped {skipped} rows without usable images.")
