---
title: Agromind CNN + YOLO API
emoji: 🌿
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# Agromind CNN + YOLO API

FastAPI service for Agromind AI leaf detection and disease inference.

Endpoints:

- `GET /health`
- `POST /detect-leaf`
- `POST /predict`

`/detect-leaf` runs YOLO and returns the best leaf crop.
`/predict` runs YOLO first; if no leaf is detected, CNN is not called and the request is rejected.

Both endpoints accept either multipart field `image` or JSON field `image_data_url`.

Required files:

- `agromindaimodel.pth`
- `yolo_leaf.pt`

## Authentication

`/detect-leaf` and `/predict` accept `Authorization: Bearer <token>` and compare it
against the `CNN_API_TOKEN` Space secret.

- If `CNN_API_TOKEN` is **not** set, both endpoints stay open (so the Space keeps
  working before the secret is configured).
- If it **is** set, requests without a matching token get `401`.

To turn it on, set the same value in both places:

1. Space → Settings → Variables and secrets → new **secret** `CNN_API_TOKEN`
2. Render → the backend service → environment variable `CNN_API_TOKEN`

`GET /health` is always public because the keep-warm cron pings it without
credentials.
