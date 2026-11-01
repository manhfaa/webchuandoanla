# Agromind AI Node client

This package is not yet published or enabled in production. Use it only on a trusted server; never expose the API key in browser JavaScript or a mobile application.

```js
import { randomUUID } from "node:crypto";
import { AgromindClient } from "agromind-ai-client";

const client = new AgromindClient(process.env.AGROMIND_API_KEY);
const requestId = randomUUID();
const result = await client.diagnose("leaf.jpg", { idempotencyKey: requestId });
console.log(result);
```

After a timeout or HTTP 202, retry with the same idempotency key and unchanged image. The backend decides whether to reserve, debit, or release the charge.
