from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import HfApi, create_repo


ROOT = Path(__file__).resolve().parent.parent
SPACE_DIR = ROOT / "hf_space"
MODEL_FILE = SPACE_DIR / "agromindaimodel.pth"
YOLO_MODEL_FILE = SPACE_DIR / "yolo_leaf.pt"


def main() -> None:
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    if not token:
        raise SystemExit("Set HF_TOKEN first.")

    if not YOLO_MODEL_FILE.exists():
        raise SystemExit(f"Missing {YOLO_MODEL_FILE}. Copy moduleyolola/best.pt into hf_space/yolo_leaf.pt first.")
    if not MODEL_FILE.exists():
        raise SystemExit(f"Missing {MODEL_FILE}. Copy the new CNN checkpoint into hf_space first.")

    api = HfApi(token=token)
    username = api.whoami()["name"]
    repo_id = os.getenv("HF_SPACE_ID") or f"{username}/agromind-cnn-api"

    create_repo(
        repo_id=repo_id,
        token=token,
        repo_type="space",
        space_sdk="docker",
        exist_ok=True,
    )

    api.upload_folder(
        repo_id=repo_id,
        repo_type="space",
        token=token,
        folder_path=str(SPACE_DIR),
        ignore_patterns=["__pycache__/**", "*.pyc"],
        commit_message="Deploy Agromind CNN and YOLO leaf gate Space",
    )

    space_name = repo_id.split("/", 1)[1]
    print(f"SPACE_ID={repo_id}")
    print(f"CNN_API_URL=https://{username}-{space_name}.hf.space")


if __name__ == "__main__":
    main()
