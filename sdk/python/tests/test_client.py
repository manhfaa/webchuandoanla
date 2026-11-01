import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from agromind_ai import AgromindClient, AgromindError


class ClientTests(unittest.TestCase):
    def test_upload_uses_server_authorization_and_idempotency(self):
        response = Mock(status_code=200)
        response.json.return_value = {"plant_name": "Tomato"}
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "leaf.png"
            image.write_bytes(b"example")
            with patch("agromind_ai.client.requests.post", return_value=response) as post:
                result = AgromindClient("sk_agm_test_example").diagnose(image, idempotency_key="request-1")
        self.assertEqual(result["plant_name"], "Tomato")
        self.assertEqual(post.call_args.kwargs["headers"]["Idempotency-Key"], "request-1")
        self.assertFalse(post.call_args.kwargs["allow_redirects"])

    def test_rejects_insecure_base_url(self):
        with self.assertRaises(ValueError):
            AgromindClient("sk_agm_test_example", base_url="http://example.com")

    def test_processing_does_not_look_like_success(self):
        response = Mock(status_code=202)
        response.json.return_value = {"detail": "Request is still processing."}
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "leaf.png"
            image.write_bytes(b"example")
            with patch("agromind_ai.client.requests.post", return_value=response):
                with self.assertRaises(AgromindError) as caught:
                    AgromindClient("sk_agm_test_example").diagnose(image, idempotency_key="request-1")
        self.assertEqual(caught.exception.status_code, 202)
