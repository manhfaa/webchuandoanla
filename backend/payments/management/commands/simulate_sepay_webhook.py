import hashlib
import hmac
import json
import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from payments.models import PaymentOrder


class Command(BaseCommand):
    help = "Send a signed SePay-like webhook to a local or test backend."

    def add_arguments(self, parser):
        parser.add_argument("--order", help="PaymentOrder UUID from the current database.")
        parser.add_argument("--payment-code", help="Payment code when the order is not in the local database.")
        parser.add_argument("--amount", type=int, help="Override transfer amount in VND.")
        parser.add_argument("--url", default="http://127.0.0.1:8000/api/payments/webhooks/sepay/")
        parser.add_argument("--transaction-id", default="")

    def handle(self, *args, **options):
        order = None
        if options["order"]:
            order = PaymentOrder.objects.filter(id=options["order"]).first()
            if not order:
                raise CommandError("Payment order was not found in the current database.")

        payment_code = options["payment_code"] or (order.payment_code if order else "")
        amount = options["amount"] or (order.amount_expected if order else 0)
        if not payment_code or amount <= 0:
            raise CommandError("Provide --order or both --payment-code and --amount.")

        transaction_id = options["transaction_id"] or f"test-{int(time.time() * 1000)}"
        payload = {
            "id": transaction_id,
            "gateway": getattr(settings, "SEPAY_BANK_NAME", "") or settings.SEPAY_BANK_CODE,
            "transactionDate": time.strftime("%Y-%m-%d %H:%M:%S"),
            "accountNumber": settings.SEPAY_ACCOUNT_NUMBER,
            "code": payment_code,
            "content": payment_code,
            "transferType": "in",
            "transferAmount": amount,
            "referenceCode": f"SIM{int(time.time())}",
        }
        raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json"}

        secret = getattr(settings, "SEPAY_WEBHOOK_SECRET", "").strip()
        if secret:
            timestamp = str(int(time.time()))
            digest = hmac.new(
                secret.encode("utf-8"),
                timestamp.encode("ascii") + b"." + raw_body,
                hashlib.sha256,
            ).hexdigest()
            headers["X-SePay-Timestamp"] = timestamp
            headers["X-SePay-Signature"] = f"sha256={digest}"
        else:
            api_key = getattr(settings, "SEPAY_API_KEY", "").strip()
            if not api_key:
                raise CommandError("Configure SEPAY_WEBHOOK_SECRET or SEPAY_API_KEY first.")
            headers["Authorization"] = f"Apikey {api_key}"

        response = requests.post(options["url"], data=raw_body, headers=headers, timeout=20)
        self.stdout.write(f"HTTP {response.status_code}")
        self.stdout.write(response.text)
        if not response.ok:
            raise CommandError("Webhook simulation failed.")
