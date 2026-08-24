"""Tests for the endpoints the Android app added.

What is worth testing here is not that the happy path returns 200 — it is the
handful of rules that, if they broke, would cost a grower money or hand them a
confident answer nobody checked:

* a retry must not buy a second inference call, a second pair of Tavily searches
  or a second chat question;
* the confidences a summary is written from must come from the server, never from
  the request body;
* the seven research stages must run in that order, and a failure must surface as
  a failure rather than as prose;
* the expert workspace must not receive diagnosis context even when the client
  sends it.

No provider is ever called. The fakes return the same shapes the real ones do.
"""

from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from engagement.models import ChatConversation, ChatMessage, ServicePlan
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from aiproviders import ProviderFailed, ProviderNotConfigured

from .models import ClientRequest, Diagnosis

User = get_user_model()

def image_bytes(image_format: str) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (2, 2), color=(42, 132, 78)).save(buffer, format=image_format)
    return buffer.getvalue()


JPEG = image_bytes("JPEG")
PNG = image_bytes("PNG")
NOT_AN_IMAGE = b"%PDF-1.4 this is not a leaf" + b"0" * 512

CNN_RESULT = {
    "class_name": "Tomato___Late_blight",
    "plant_name": "Cà chua",
    "disease_name": "Mốc sương",
    "confidence": 0.88,
    "top_predictions": [
        {"class_name": "Tomato___Late_blight", "plant_name": "Cà chua", "disease_name": "Mốc sương", "confidence": 0.88},
        {"class_name": "Tomato___Early_blight", "plant_name": "Cà chua", "disease_name": "Đốm vòng", "confidence": 0.07},
    ],
    "model_version": "test",
    "action_plan": {},
    "yolo_payload": {"is_leaf": True, "confidence": 0.97},
}


def jpeg(name="leaf.jpg"):
    return SimpleUploadedFile(name, JPEG, content_type="image/jpeg")


class MobileApiTestCase(APITestCase):
    """Shared account, authenticated the way the app authenticates."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="grower", email="grower@example.com", password="Vuon-2026"
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}"
        )

    def unlock(self, **fields):
        """Turn plan flags on for the account under test."""
        ServicePlan.objects.filter(slug="seed").update(**fields)

    def set_caps(self, **caps):
        plan = ServicePlan.objects.get(slug="seed")
        ServicePlan.objects.filter(slug="seed").update(metadata={**plan.metadata, **caps})

    def make_diagnosis(self, **fields):
        return Diagnosis.objects.create(
            user=self.user,
            plant_name="Cà chua",
            disease_name="Mốc sương",
            cnn_confidence=0.88,
            is_leaf=True,
            cnn_payload=CNN_RESULT,
            **fields,
        )


class CnnMultipartTests(MobileApiTestCase):
    URL = "/api/diagnoses/cnn-multipart/"

    def test_client_request_id_is_required(self):
        response = self.client.post(self.URL, {"image": jpeg()}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("client_request_id", response.data["detail"])

    def test_a_retry_returns_the_first_answer_without_running_the_model_again(self):
        with patch("diagnoses.views.classify_and_enrich", return_value=dict(CNN_RESULT)) as model:
            first = self.client.post(
                self.URL, {"image": jpeg(), "client_request_id": "req-0001"}, format="multipart"
            )
            second = self.client.post(
                self.URL, {"image": jpeg(), "client_request_id": "req-0001"}, format="multipart"
            )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data, first.data)
        self.assertEqual(model.call_count, 1)

    def test_a_replay_is_answered_even_after_the_daily_cap_fills(self):
        """A dropped connection must not turn yesterday's answer into a refusal."""
        self.set_caps(daily_diagnoses=1)

        with patch("diagnoses.views.classify_and_enrich", return_value=dict(CNN_RESULT)):
            first = self.client.post(
                self.URL, {"image": jpeg(), "client_request_id": "req-0002"}, format="multipart"
            )
            Diagnosis.objects.create(user=self.user, title="Đã lưu")  # fills the cap
            replay = self.client.post(
                self.URL, {"image": jpeg(), "client_request_id": "req-0002"}, format="multipart"
            )
            fresh = self.client.post(
                self.URL, {"image": jpeg(), "client_request_id": "req-0003"}, format="multipart"
            )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(fresh.status_code, status.HTTP_402_PAYMENT_REQUIRED)

    def test_a_mislabelled_file_is_refused_on_its_real_bytes(self):
        lying = SimpleUploadedFile("leaf.jpg", NOT_AN_IMAGE, content_type="image/jpeg")

        with patch("diagnoses.views.classify_and_enrich") as model:
            response = self.client.post(
                self.URL, {"image": lying, "client_request_id": "req-0004"}, format="multipart"
            )

        self.assertEqual(response.status_code, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        model.assert_not_called()

    def test_png_is_accepted(self):
        with patch("diagnoses.views.classify_and_enrich", return_value=dict(CNN_RESULT)):
            response = self.client.post(
                self.URL,
                {
                    "image": SimpleUploadedFile("leaf.png", PNG, content_type="image/png"),
                    "client_request_id": "req-0005",
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_an_oversized_image_is_refused_before_inference(self):
        with self.settings(DIAGNOSIS_IMAGE_MAX_BYTES=128):
            with patch("diagnoses.views.classify_and_enrich") as model:
                response = self.client.post(
                    self.URL, {"image": jpeg(), "client_request_id": "req-0006"}, format="multipart"
                )

        self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        model.assert_not_called()

    def test_the_result_is_kept_so_research_can_read_it_back(self):
        with patch("diagnoses.views.classify_and_enrich", return_value=dict(CNN_RESULT)):
            self.client.post(
                self.URL, {"image": jpeg(), "client_request_id": "req-0007"}, format="multipart"
            )

        row = ClientRequest.objects.get(
            user=self.user, scope=ClientRequest.SCOPE_CNN, client_request_id="req-0007"
        )
        self.assertEqual(row.response["top_predictions"][0]["confidence"], 0.88)


class FakeProviders:
    """Records every provider call in order, so a test can assert the sequence."""

    def __init__(self):
        self.calls: list[str] = []
        self.prompts: list[str] = []

    def deepseek(self, *, step, messages, max_tokens=700, temperature=0.2, json_mode=True):
        self.calls.append(f"deepseek:{step}")
        self.prompts.append(" ".join(m.get("content", "") for m in messages))
        if not json_mode:
            return "Liệu bệnh mốc sương trên cà chua có phù hợp với triệu chứng này không?"
        if "độ phù hợp" in step:
            return (
                '{"is_consistent": true, "best_match": "Cà chua - Mốc sương",'
                ' "summary": "Triệu chứng khớp với mốc sương [1].",'
                ' "confidence_note": "Tham khảo thêm ngoài vườn."}'
            )
        if "phương pháp xử lý" in step:
            return '{"summary": "Tỉa lá bệnh và thoáng gió [1].", "safety_note": "Đọc nhãn thuốc."}'
        return '{"final_conclusion": "Nhiều khả năng là mốc sương.", "user_next_step": "Theo dõi 3 ngày."}'

    def tavily(self, *, query, step):
        self.calls.append(f"tavily:{step}")
        return [
            {
                "title": "Late blight of tomato",
                "url": "https://extension.example.edu/late-blight",
                "content": "Water-soaked lesions on leaves.",
                "raw_content": "Full page text about late blight." * 40,
            }
        ]


class ResearchSymptomsTests(MobileApiTestCase):
    URL = "/api/diagnoses/research-symptoms/"

    def setUp(self):
        super().setUp()
        self.unlock(rag_enabled=True)
        self.fake = FakeProviders()
        self.patches = [
            patch("aiproviders.deepseek.complete", side_effect=self.fake.deepseek),
            patch("aiproviders.tavily.search", side_effect=self.fake.tavily),
        ]
        for p in self.patches:
            p.start()
        self.addCleanup(lambda: [p.stop() for p in self.patches])

    def post(self, **body):
        body.setdefault("client_request_id", "res-0001")
        return self.client.post(self.URL, body, format="json")

    def test_no_symptoms_skips_the_run_entirely(self):
        diagnosis = self.make_diagnosis()

        response = self.post(diagnosis_id=diagnosis.pk, symptoms="   ")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["skipped"])
        self.assertEqual(self.fake.calls, [])

    def test_the_seven_stages_run_in_order(self):
        diagnosis = self.make_diagnosis()

        response = self.post(diagnosis_id=diagnosis.pk, symptoms="Lá có đốm nâu loang nước")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kinds = [call.split(":", 1)[0] for call in self.fake.calls]
        self.assertEqual(
            kinds,
            [
                "deepseek",  # display question, compatibility
                "deepseek",  # tavily query, compatibility
                "tavily",  # compatibility search
                "deepseek",  # compatibility summary
                "deepseek",  # display question, treatment
                "deepseek",  # tavily query, treatment
                "tavily",  # treatment search
                "deepseek",  # treatment summary
                "deepseek",  # final conclusion
            ],
        )

    def test_sources_reach_the_app_without_the_page_text(self):
        diagnosis = self.make_diagnosis()

        response = self.post(diagnosis_id=diagnosis.pk, symptoms="Đốm nâu")

        source = response.data["compatibility_sources"][0]
        self.assertNotIn("raw_content", source)
        self.assertEqual(source["domain"], "extension.example.edu")
        self.assertLessEqual(len(source["snippet"]), 480)

    def test_predictions_come_from_the_server_not_the_request_body(self):
        """A client claiming 99% on another disease must not change the write-up."""
        diagnosis = self.make_diagnosis()

        response = self.post(
            diagnosis_id=diagnosis.pk,
            symptoms="Đốm nâu",
            selected_prediction={"plant_name": "Xoài", "disease_name": "Thán thư", "confidence": 0.99},
            top_predictions=[{"plant_name": "Xoài", "disease_name": "Thán thư", "confidence": 0.99}],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sent = " ".join(self.fake.prompts)
        self.assertIn("Cà chua", sent)
        self.assertNotIn("Xoài", sent)

    def test_another_users_diagnosis_is_not_found(self):
        stranger = User.objects.create_user(username="other", email="o@example.com", password="x")
        theirs = Diagnosis.objects.create(user=stranger, cnn_payload=CNN_RESULT)

        response = self.post(diagnosis_id=theirs.pk, symptoms="Đốm nâu")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_plan_without_the_feature_is_refused_before_any_provider_call(self):
        self.unlock(rag_enabled=False)
        diagnosis = self.make_diagnosis()

        response = self.post(diagnosis_id=diagnosis.pk, symptoms="Đốm nâu")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["feature"], "rag")
        self.assertEqual(self.fake.calls, [])

    def test_a_provider_failure_is_a_failure_not_a_summary(self):
        diagnosis = self.make_diagnosis()

        with patch(
            "aiproviders.tavily.search",
            side_effect=ProviderFailed("tìm phương pháp xử lý", "Không tìm được nguồn."),
        ):
            response = self.post(diagnosis_id=diagnosis.pk, symptoms="Đốm nâu")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["step"], "tìm phương pháp xử lý")
        self.assertNotIn("final_conclusion", response.data)

    def test_a_missing_key_is_reported_as_not_configured(self):
        diagnosis = self.make_diagnosis()

        with patch(
            "aiproviders.deepseek.complete",
            side_effect=ProviderNotConfigured("viết câu hỏi", "Chưa bật."),
        ):
            response = self.post(diagnosis_id=diagnosis.pk, symptoms="Đốm nâu")

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(response.data["available"])

    def test_a_retry_returns_the_first_run_without_searching_again(self):
        diagnosis = self.make_diagnosis()

        first = self.post(diagnosis_id=diagnosis.pk, symptoms="Đốm nâu")
        calls_after_first = len(self.fake.calls)
        second = self.post(diagnosis_id=diagnosis.pk, symptoms="Đốm nâu")

        self.assertEqual(second.data["final_conclusion"], first.data["final_conclusion"])
        self.assertEqual(len(self.fake.calls), calls_after_first)

    def test_the_result_is_written_back_onto_the_diagnosis(self):
        diagnosis = self.make_diagnosis()

        self.post(diagnosis_id=diagnosis.pk, symptoms="Lá có đốm nâu loang nước")

        diagnosis.refresh_from_db()
        self.assertEqual(diagnosis.symptom_input, "Lá có đốm nâu loang nước")
        self.assertIn("mốc sương", diagnosis.rag_summary.lower())
        self.assertIn("compatibility_sources", diagnosis.rag_payload)

    def test_an_unsaved_check_can_be_verified_through_its_leaf_check_id(self):
        """The app runs research before the grower has decided to save anything."""
        with patch("diagnoses.views.classify_and_enrich", return_value=dict(CNN_RESULT)):
            self.client.post(
                "/api/diagnoses/cnn-multipart/",
                {"image": jpeg(), "client_request_id": "cnn-9001"},
                format="multipart",
            )

        response = self.post(cnn_request_id="cnn-9001", symptoms="Đốm nâu")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["available"])

    def test_an_expired_leaf_check_id_asks_for_a_fresh_analysis(self):
        response = self.post(cnn_request_id="cnn-does-not-exist", symptoms="Đốm nâu")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)


class ChatRespondTests(MobileApiTestCase):
    URL = "/api/engagement/chat/respond/"

    def setUp(self):
        super().setUp()
        self.set_caps(chat_daily=3)
        self.answers = []
        patcher = patch(
            "engagement.services.chat.deepseek.complete",
            side_effect=lambda **kwargs: self._answer(**kwargs),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def _answer(self, *, step, messages, max_tokens=700, temperature=0.2, json_mode=True):
        self.answers.append(messages)
        return "Bạn tỉa bớt lá bệnh và giữ vườn thoáng nhé."

    def post(self, **body):
        body.setdefault("client_request_id", "chat-0001")
        body.setdefault("query", "Lá này cần theo dõi gì?")
        return self.client.post(self.URL, body, format="json")

    def test_the_question_and_the_answer_are_both_recorded(self):
        response = self.post()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        conversation = ChatConversation.objects.get(pk=response.data["conversation_id"])
        self.assertEqual(
            list(conversation.messages.values_list("role", flat=True)), ["user", "assistant"]
        )

    def test_expert_mode_never_receives_diagnosis_context(self):
        self.unlock(expert_chat_enabled=True)
        diagnosis = self.make_diagnosis()

        self.post(mode="expert", diagnosis_id=diagnosis.pk)

        sent = str(self.answers[-1])
        self.assertNotIn("Mốc sương", sent)
        self.assertIn("không dùng dữ liệu CNN/YOLO", sent)

    def test_assistant_mode_receives_the_chosen_check(self):
        diagnosis = self.make_diagnosis()

        self.post(mode="assistant", diagnosis_id=diagnosis.pk)

        self.assertIn("Mốc sương", str(self.answers[-1]))

    def test_a_locked_expert_workspace_is_refused_before_the_provider(self):
        self.unlock(expert_chat_enabled=False)

        response = self.post(mode="expert")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["feature"], "expert_chat")
        self.assertEqual(self.answers, [])
        self.assertEqual(ChatMessage.objects.count(), 0)

    def test_the_daily_cap_stops_the_question_before_it_is_answered(self):
        for index in range(3):
            self.post(client_request_id=f"chat-000{index}")

        response = self.post(client_request_id="chat-over")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(len(self.answers), 3)

    def test_another_users_diagnosis_is_not_found(self):
        stranger = User.objects.create_user(username="other", email="o@example.com", password="x")
        theirs = Diagnosis.objects.create(user=stranger)

        response = self.post(diagnosis_id=theirs.pk)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_retry_after_a_provider_failure_does_not_charge_twice(self):
        with patch(
            "engagement.services.chat.deepseek.complete",
            side_effect=ProviderFailed("trả lời câu hỏi tư vấn", "Nhà cung cấp lỗi."),
        ):
            failed = self.post()

        self.assertEqual(failed.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(ChatMessage.objects.filter(role="user").count(), 1)

        retried = self.post()

        self.assertEqual(retried.status_code, status.HTTP_200_OK)
        # Still one question charged, now with an answer against it.
        self.assertEqual(ChatMessage.objects.filter(role="user").count(), 1)
        self.assertEqual(ChatMessage.objects.filter(role="assistant").count(), 1)

    def test_a_retry_of_an_answered_question_replays_it(self):
        first = self.post()
        second = self.post()

        self.assertEqual(second.data["message_id"], first.data["message_id"])
        self.assertEqual(len(self.answers), 1)

    def test_an_expert_question_cannot_be_slipped_into_an_advisor_conversation(self):
        self.post(mode="assistant", client_request_id="chat-000a")
        advisor_id = ChatConversation.objects.get().pk
        self.unlock(expert_chat_enabled=False)

        response = self.post(
            mode="expert", conversation_id=advisor_id, client_request_id="chat-000b"
        )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)


class MobileConfigTests(APITestCase):
    URL = "/api/mobile/config/"

    def test_it_is_readable_without_a_token(self):
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("minimum_supported_version", response.json())

    def test_a_feature_is_off_when_its_key_is_missing(self):
        with self.settings(DEEPSEEK_API_KEY="", TAVILY_API_KEY=""):
            body = self.client.get(self.URL).json()

        self.assertFalse(body["features"]["symptom_research"])
        self.assertFalse(body["features"]["expert_chat"])

    def test_it_reports_a_feature_as_on_without_naming_its_key(self):
        with self.settings(DEEPSEEK_API_KEY="sk-secret", TAVILY_API_KEY="tvly-secret"):
            response = self.client.get(self.URL)

        raw = response.content.decode()
        self.assertTrue(response.json()["features"]["symptom_research"])
        self.assertNotIn("sk-secret", raw)
        self.assertNotIn("tvly-secret", raw)


class HousekeepingPruneTests(MobileApiTestCase):
    def test_expired_replay_records_are_removed(self):
        from . import idempotency

        idempotency.remember(self.user, ClientRequest.SCOPE_CHAT, "old-one", {"answer": "x"})
        ClientRequest.objects.filter(client_request_id="old-one").update(
            created_at=timezone.now() - timedelta(hours=100)
        )
        idempotency.remember(self.user, ClientRequest.SCOPE_CHAT, "fresh-one", {"answer": "y"})

        removed = idempotency.prune()

        self.assertEqual(removed, 1)
        self.assertTrue(ClientRequest.objects.filter(client_request_id="fresh-one").exists())
