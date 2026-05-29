from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import HfApi, create_repo, upload_folder


ROOT = Path(__file__).resolve().parent.parent
SPACE_DIR = ROOT / "hf_space"
MODEL_FILE = SPACE_DIR / "best_model.pth"


def main() -> None:
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    if not token:
        raise SystemExit("Set HF_TOKEN first.")

    if not MODEL_FILE.exists():
        raise SystemExit(f"Missing {MODEL_FILE}. Copy best_model.pth into hf_space first.")

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

    upload_folder(
        repo_id=repo_id,
        repo_type="space",
        token=token,
        folder_path=str(SPACE_DIR),
        commit_message="Deploy Agromind CNN FastAPI Space",
    )

    space_name = repo_id.split("/", 1)[1]
    print(f"SPACE_ID={repo_id}")
    print(f"CNN_API_URL=https://{username}-{space_name}.hf.space")


if __name__ == "__main__":
    main()
