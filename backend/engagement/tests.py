from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ChatConversation, ChatMessage

User = get_user_model()


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
