---
title: Agromind CNN API
emoji: 🌿
colorFrom: green
colorTo: cyan
sdk: docker
pinned: false
---

# Agromind CNN API

FastAPI service for Agromind AI leaf disease CNN inference.

Endpoints:

- `GET /health`
- `POST /predict`

`/predict` accepts either multipart field `image` or JSON field `image_data_url`.
