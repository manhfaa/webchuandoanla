# Agromind AI Python client

This package is not yet published or enabled in production. Install from this directory for development with `pip install .`.

Keep your API key on your server, not in browser JavaScript, a mobile app, Git, or logs.

```python
import os
from uuid import uuid4
from agromind_ai import AgromindClient

client = AgromindClient(os.environ["AGROMIND_API_KEY"])
result = client.diagnose("leaf.jpg", idempotency_key=str(uuid4()))
print(result)
```

Use the same idempotency key and identical image when retrying a request after a timeout. A `202` response means the original request is still being processed; retry with the same key. A completed request is not charged twice. The server enforces pricing and balance; never calculate or trust balance in client code.
