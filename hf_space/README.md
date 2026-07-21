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
