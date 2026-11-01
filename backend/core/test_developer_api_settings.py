"""Isolated local-only PostgreSQL configuration for developer API tests."""

import os

from .settings import *  # noqa: F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": "127.0.0.1",
        "PORT": int(os.environ["AGROMIND_TEST_PG_PORT"]),
        "NAME": "agromind_devtest",
        "USER": "agromind_test",
        "PASSWORD": "local-test-only",
        "TEST": {"NAME": "test_agromind_devtest"},
    }
}
