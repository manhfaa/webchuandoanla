"""Errors shared by the provider clients.

Two failure modes, deliberately kept apart because the app answers them
differently:

* `ProviderNotConfigured` — the key is missing on this deployment. Nothing the
  grower did is wrong and retrying will not help until an operator sets the
  environment variable. Maps to 503.
* `ProviderFailed` — the provider was called and did not deliver. Retrying can
  work. Maps to 502.

Both carry `step`, the Vietnamese name of the pipeline stage, so the client can
show which stage broke instead of a generic "AI lỗi".
"""

from __future__ import annotations


class ProviderError(RuntimeError):
    """Base class so a caller can catch both without importing each name."""

    def __init__(self, step: str, message: str) -> None:
        super().__init__(message)
        self.step = step
        self.message = message


class ProviderNotConfigured(ProviderError):
    """The provider key is not set on this deployment."""


class ProviderFailed(ProviderError):
    """The provider was reachable but did not return a usable answer."""
