import importlib

from django.apps import apps as global_apps
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from payments.entitlements import limit_for
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ChatConversation, ChatMessage, ExpertConsultation, ServicePlan

User = get_user_model()


def authenticate(client, user):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")


def activate_plan(user, slug):
    """Put the user on a paid plan the way a settled payment would."""
    user.current_plan = slug
    user.plan_expires_at = timezone.now() + timezone.timedelta(days=5)
    user.save(update_fields=["current_plan", "plan_expires_at", "updated_at"])


class ChatOwnershipTests(APITestCase):
    """A user must not be able to write into another user's conversation.

    Filtering ``get_queryset`` only protects reads; the writable ``conversation``
    relation on the serializer previously let anyone post into any conversation
    by supplying its id.
    """

    def setUp(self):
        self.victim = User.objects.create_user(username="victim", email="victim@example.com", password="VictimPass#2026")
        self.attacker = User.objects.create_user(username="attacker", email="attacker@example.com", password="AttackPass#2026")
        self.victim_conversation = ChatConversation.objects.create(user=self.victim, mode="assistant", title="Riêng tư")

    def authenticate(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_cannot_post_message_into_another_users_conversation(self):
        self.authenticate(self.attacker)

        response = self.client.post(
            reverse("message-list-create"),
            {"conversation": self.victim_conversation.id, "role": "user", "content": "injected"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ChatMessage.objects.filter(conversation=self.victim_conversation).exists())

    def test_can_post_message_into_own_conversation(self):
        self.authenticate(self.attacker)
        own_conversation = ChatConversation.objects.create(user=self.attacker, mode="assistant", title="Của tôi")

        response = self.client.post(
            reverse("message-list-create"),
            {"conversation": own_conversation.id, "role": "user", "content": "hello"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ChatMessage.objects.filter(conversation=own_conversation).count(), 1)

    def test_cannot_attach_consultation_to_another_users_conversation(self):
        self.authenticate(self.attacker)

        response = self.client.post(
            reverse("expert-consultation-list-create"),
            {"conversation": self.victim_conversation.id, "topic": "x", "question": "y"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_messages_list_only_returns_own_messages(self):
        ChatMessage.objects.create(conversation=self.victim_conversation, role="user", content="secret")
        self.authenticate(self.attacker)

        response = self.client.get(reverse("message-list-create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class CnnEndpointAuthTests(APITestCase):
    """Inference is expensive and runs on a free Space — it must require auth."""

    def test_anonymous_cnn_request_is_rejected(self):
        response = self.client.post(reverse("diagnosis-cnn"), {"image_data_url": "data:image/png;base64,AAAA"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ServicePlanCatalogueTests(APITestCase):
    """The pricing page builds the comparison table from this response.

    Every cap it shows has to come from here, so a quota is never claimed on the
    pricing page and enforced from a different number in Python.
    """

    def setUp(self):
        self.user = User.objects.create_user(username="cat", email="cat@example.com", password="CatPass#2026")

    def test_plans_endpoint_publishes_the_crop_plan_quota(self):
        response = self.client.get(reverse("plan-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        metadata = {row["slug"]: row["metadata"] for row in response.data}
        self.assertEqual(metadata["seed"]["crop_plans"], 0)
        self.assertEqual(metadata["grow"]["crop_plans"], 2)
        self.assertEqual(metadata["bloom"]["crop_plans"], 10)
        # null, not 0: the crop-plan cap reads 0 as "zero allowed" (Seed) and
        # null as unlimited, the opposite of the other caps.
        self.assertIsNone(metadata["elite"]["crop_plans"])

    def test_the_quota_did_not_replace_the_rest_of_the_catalogue(self):
        response = self.client.get(reverse("plan-list"))

        metadata = {row["slug"]: row["metadata"] for row in response.data}
        self.assertEqual(metadata["seed"]["daily_diagnoses"], 5)
        self.assertEqual(metadata["seed"]["history_days"], 7)
        self.assertEqual(metadata["seed"]["chat_daily"], 3)
        self.assertTrue(metadata["elite"]["reports"])

    def test_catalogue_publishes_the_term_a_purchase_actually_buys(self):
        """A promotion is a change to SEPAY_SUBSCRIPTION_DAYS, so the pricing
        screens have to read the term from here rather than print a fixed 30.
        Otherwise the site keeps advertising a term the backend stopped granting
        the moment the setting went back."""
        with self.settings(SEPAY_SUBSCRIPTION_DAYS=30):
            response = self.client.get(reverse("plan-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(row["subscription_days"] == 30 for row in response.data))

        with self.settings(SEPAY_SUBSCRIPTION_DAYS=90):
            promo = self.client.get(reverse("plan-list"))
        self.assertTrue(all(row["subscription_days"] == 90 for row in promo.data))
        # The promotion lengthens the term; it must not quietly change the price.
        before = {row["slug"]: row["price_monthly"] for row in response.data}
        after = {row["slug"]: row["price_monthly"] for row in promo.data}
        self.assertEqual(before, after)

    def test_a_nonsense_term_setting_cannot_publish_a_zero_day_plan(self):
        with self.settings(SEPAY_SUBSCRIPTION_DAYS=0):
            response = self.client.get(reverse("plan-list"))

        # `_activate_locked_order` clamps with max(1, ...) before writing an
        # expiry, so the catalogue has to clamp identically or the screen would
        # promise a term the activation does not grant.
        self.assertTrue(all(row["subscription_days"] == 1 for row in response.data))
        self.assertTrue(all(row["expert_chat_enabled"] for row in response.data if row["slug"] in ("bloom", "elite")))

    def test_the_crop_plan_cap_is_data_rather_than_code(self):
        plan = ServicePlan.objects.get(slug="seed")
        plan.metadata = {**plan.metadata, "crop_plans": 4}
        plan.save(update_fields=["metadata"])

        self.assertEqual(limit_for(self.user, "crop_plans"), 4)

    def test_the_quota_migration_reverses_by_removing_only_its_own_key(self):
        migration = importlib.import_module("engagement.migrations.0005_add_crop_plan_quota")

        migration.remove_crop_plan_quota(global_apps, None)
        reversed_metadata = ServicePlan.objects.get(slug="seed").metadata
        self.assertNotIn("crop_plans", reversed_metadata)
        self.assertEqual(reversed_metadata["daily_diagnoses"], 5)

        migration.add_crop_plan_quota(global_apps, None)
        self.assertEqual(ServicePlan.objects.get(slug="seed").metadata["crop_plans"], 0)


class ChatQuotaTests(APITestCase):
    """``chat_daily`` from the catalogue caps how many questions a day costs."""

    def setUp(self):
        self.user = User.objects.create_user(username="grower", email="grower@example.com", password="GrowerPass#2026")
        self.conversation = ChatConversation.objects.create(user=self.user, mode="rag", title="Theo kết quả")
        self.cap = ServicePlan.objects.get(slug="seed").metadata["chat_daily"]
        authenticate(self.client, self.user)

    def ask(self, conversation=None, role="user", content="Lá bị đốm nâu thì nên làm gì?"):
        return self.client.post(
            reverse("message-list-create"),
            {"conversation": (conversation or self.conversation).id, "role": role, "content": content},
            format="json",
        )

    def test_a_seed_user_is_stopped_at_the_published_cap(self):
        for _ in range(self.cap):
            self.assertEqual(self.ask().status_code, status.HTTP_201_CREATED)

        response = self.ask()

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["limit"], self.cap)
        self.assertEqual(response.data["used"], self.cap)
        self.assertEqual(response.data["upgrade_to"], "grow")
        # A bare 402 is useless to a grower: the message has to name the cap and
        # the plan that lifts it.
        self.assertIn(str(self.cap), str(response.data["detail"]))
        self.assertIn("Grow", str(response.data["detail"]))
        # Refusing the new question must not touch what the user already sent.
        self.assertEqual(ChatMessage.objects.filter(conversation=self.conversation).count(), self.cap)

    def test_assistant_replies_never_consume_the_quota(self):
        for _ in range(self.cap + 2):
            self.assertEqual(self.ask(role="assistant", content="Trả lời").status_code, status.HTTP_201_CREATED)

        self.assertEqual(self.ask().status_code, status.HTTP_201_CREATED)

    def test_the_cap_follows_the_user_not_one_conversation(self):
        another = ChatConversation.objects.create(user=self.user, mode="rag", title="Cuộc khác")
        for _ in range(self.cap):
            self.ask()

        self.assertEqual(self.ask(conversation=another).status_code, status.HTTP_402_PAYMENT_REQUIRED)

    def test_questions_from_yesterday_do_not_count_against_today(self):
        for _ in range(self.cap):
            ChatMessage.objects.create(conversation=self.conversation, role="user", content="hôm qua")
        ChatMessage.objects.filter(conversation=self.conversation).update(
            created_at=timezone.now() - timezone.timedelta(days=1)
        )

        self.assertEqual(self.ask().status_code, status.HTTP_201_CREATED)

    def test_another_users_questions_do_not_consume_my_quota(self):
        neighbour = User.objects.create_user(username="neighbour", email="neighbour@example.com", password="NeighbourPass#2026")
        neighbour_conversation = ChatConversation.objects.create(user=neighbour, mode="rag")
        for _ in range(self.cap):
            ChatMessage.objects.create(conversation=neighbour_conversation, role="user", content="của người khác")

        self.assertEqual(self.ask().status_code, status.HTTP_201_CREATED)

    def test_a_plan_that_sells_unlimited_chat_is_never_capped(self):
        activate_plan(self.user, "bloom")

        for _ in range(self.cap + 2):
            self.assertEqual(self.ask().status_code, status.HTTP_201_CREATED)

    def test_a_question_relabelled_as_another_role_cannot_dodge_the_quota(self):
        """``role`` arrives from the client, so it is a claim and not a fact.

        Only the counter's own role is exempt; "system" and "expert" are not the
        client's to write, and accepting them turned the published cap into a
        suggestion — the same question posted as "system" cost nothing.
        """
        for _ in range(self.cap):
            self.assertEqual(self.ask().status_code, status.HTTP_201_CREATED)

        for role in ("system", "expert"):
            with self.subTest(role=role):
                response = self.ask(role=role)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("role", response.data)

        # The refused writes must not have landed: the cap still holds.
        self.assertEqual(ChatMessage.objects.filter(conversation__user=self.user).count(), self.cap)

    def test_every_plan_stops_exactly_at_the_cap_it_publishes(self):
        """The boundary itself, read per plan out of the catalogue.

        Guards the off-by-one both ways: the cap-th question is included in what
        the plan sells, and only the next one is refused.
        """
        for slug in ("seed", "grow"):
            with self.subTest(plan=slug):
                cap = ServicePlan.objects.get(slug=slug).metadata["chat_daily"]
                user = User.objects.create_user(
                    username=f"cap-{slug}", email=f"cap-{slug}@example.com", password="CapPass#2026"
                )
                activate_plan(user, slug)
                conversation = ChatConversation.objects.create(user=user, mode="rag")
                client = APIClient()
                authenticate(client, user)

                def ask(content="Hỏi thêm"):
                    return client.post(
                        reverse("message-list-create"),
                        {"conversation": conversation.id, "role": "user", "content": content},
                        format="json",
                    )

                for index in range(cap):
                    self.assertEqual(ask().status_code, status.HTTP_201_CREATED, f"câu {index + 1}/{cap}")

                refused = ask()
                self.assertEqual(refused.status_code, status.HTTP_402_PAYMENT_REQUIRED)
                self.assertEqual(refused.data["limit"], cap)

        for slug in ("bloom", "elite"):
            with self.subTest(plan=slug):
                user = User.objects.create_user(
                    username=f"free-{slug}", email=f"free-{slug}@example.com", password="CapPass#2026"
                )
                activate_plan(user, slug)
                # 0 in the catalogue means "no cap" for this key — the opposite of
                # what it means for crop plans.
                self.assertIsNone(limit_for(user, "daily_chat_messages"))


class ExpertWorkspaceGateTests(APITestCase):
    """Advanced advice is sold from Bloom up — Seed and Grow must not reach it."""

    def setUp(self):
        self.user = User.objects.create_user(username="seeduser", email="seeduser@example.com", password="SeedPass#2026")
        authenticate(self.client, self.user)

    def test_seed_cannot_open_an_expert_conversation(self):
        response = self.client.post(
            reverse("conversation-list-create"),
            {"mode": "expert", "title": "Tư vấn đất trồng"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["code"], "plan_feature_locked")
        self.assertEqual(response.data["upgrade_to"], "bloom")
        self.assertIn("Bloom", str(response.data["detail"]))
        self.assertFalse(ChatConversation.objects.filter(user=self.user).exists())

    def test_grow_does_not_include_advanced_advice_either(self):
        activate_plan(self.user, "grow")

        response = self.client.post(reverse("conversation-list-create"), {"mode": "expert"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)

    def test_bloom_can_open_an_expert_conversation(self):
        activate_plan(self.user, "bloom")

        response = self.client.post(reverse("conversation-list-create"), {"mode": "expert"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_a_lapsed_user_still_reads_the_expert_history_they_paid_for(self):
        conversation = ChatConversation.objects.create(user=self.user, mode="expert", title="Đã hỏi trước đây")
        ChatMessage.objects.create(conversation=conversation, role="user", content="câu hỏi cũ")

        detail = self.client.get(reverse("conversation-detail", kwargs={"pk": conversation.pk}))
        listing = self.client.get(reverse("conversation-list-create"))

        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail.data["messages"]), 1)
        self.assertEqual(len(listing.data), 1)

    def test_a_lapsed_user_cannot_ask_a_new_expert_question(self):
        conversation = ChatConversation.objects.create(user=self.user, mode="expert")

        response = self.client.post(
            reverse("message-list-create"),
            {"conversation": conversation.id, "role": "user", "content": "câu hỏi mới"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["code"], "plan_feature_locked")

    def test_the_expert_gate_is_not_dodged_by_relabelling_the_message(self):
        """The gate only reads client-authored roles, so the others must not exist.

        A Seed account could otherwise keep working a paid expert thread simply
        by posting its question as ``role="expert"``.
        """
        conversation = ChatConversation.objects.create(user=self.user, mode="expert")

        for role in ("system", "expert"):
            with self.subTest(role=role):
                response = self.client.post(
                    reverse("message-list-create"),
                    {"conversation": conversation.id, "role": role, "content": "câu hỏi mới"},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertFalse(ChatMessage.objects.filter(conversation=conversation).exists())

    def test_switching_a_conversation_into_expert_mode_is_gated(self):
        conversation = ChatConversation.objects.create(user=self.user, mode="rag")

        response = self.client.patch(
            reverse("conversation-detail", kwargs={"pk": conversation.pk}),
            {"mode": "expert"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        conversation.refresh_from_db()
        self.assertEqual(conversation.mode, "rag")

    def test_expert_consultations_need_the_feature(self):
        payload = {"topic": "Sâu bệnh", "question": "Nên xử lý thế nào?"}

        locked = self.client.post(reverse("expert-consultation-list-create"), payload, format="json")
        self.assertEqual(locked.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertFalse(ExpertConsultation.objects.filter(user=self.user).exists())

        activate_plan(self.user, "elite")
        unlocked = self.client.post(reverse("expert-consultation-list-create"), payload, format="json")
        self.assertEqual(unlocked.status_code, status.HTTP_201_CREATED)
