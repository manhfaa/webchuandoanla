from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import HfApi, create_repo, get_token


ROOT = Path(__file__).resolve().parent.parent
SPACE_DIR = ROOT / "hf_space"
MODEL_FILE = SPACE_DIR / "agromindaimodel.pth"
YOLO_MODEL_FILE = SPACE_DIR / "yolo_leaf.pt"


def main() -> None:
    # Fall back to the credential `huggingface-cli login` already stored, so the
    # token never has to be pasted into a shell (where it lands in history) or
    # exported by hand before every deploy.
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN") or get_token()
    if not token:
        raise SystemExit("No Hugging Face credential. Run `huggingface-cli login` or set HF_TOKEN.")

    if not YOLO_MODEL_FILE.exists():
        raise SystemExit(f"Missing {YOLO_MODEL_FILE}. Copy moduleyolola/best.pt into hf_space/yolo_leaf.pt first.")
    if not MODEL_FILE.exists():
        raise SystemExit(f"Missing {MODEL_FILE}. Copy the new CNN checkpoint into hf_space first.")

    api = HfApi(token=token)
    me = api.whoami()
    username = me["name"]

    # Uploading needs write access. Without this check a read-only token fails
    # partway through the 320 MB upload instead of before it starts.
    role = ((me.get("auth") or {}).get("accessToken") or {}).get("role")
    if role == "read":
        raise SystemExit(
            "This Hugging Face token is read-only, so the upload would fail. "
            "Create a token with the Write role and run `huggingface-cli login` again."
        )
    repo_id = os.getenv("HF_SPACE_ID") or f"{username}/agromind-cnn-api"

    try:
        api.repo_info(repo_id=repo_id, repo_type="space")
    except Exception as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code != 404:
            raise
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
        allow_patterns=[
            "app.py",
            "Dockerfile",
            "README.md",
            "requirements.txt",
            "agromindaimodel.pth",
            "yolo_leaf.pt",
        ],
        commit_message="Deploy Agromind CNN and YOLO leaf gate Space",
    )

    space_name = repo_id.split("/", 1)[1]
    print(f"SPACE_ID={repo_id}")
    print(f"CNN_API_URL=https://{username}-{space_name}.hf.space")


if __name__ == "__main__":
    main()
