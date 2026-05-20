from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.core.paths import resolve_upload_dir
from app.models import User

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def is_allowed_upload(content_type: str | None, filename: str | None) -> bool:
    suffix = Path(filename or "").suffix.lower()
    if suffix in ALLOWED_EXTENSIONS:
        return True
    if content_type and content_type.startswith("image/"):
        return True
    return content_type in {
        "application/octet-stream",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    _ = user
    if not is_allowed_upload(file.content_type, file.filename):
        raise HTTPException(
            status_code=400,
            detail="Неподдерживаемый формат. Загрузите JPEG, PNG, WebP или GIF.",
        )

    upload_dir = resolve_upload_dir()
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        suffix = ".png" if content_type_is_png(file.content_type) else ".jpg"

    filename = f"{uuid4().hex}{suffix}"
    path = upload_dir / filename

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 10 МБ")

    try:
        path.write_bytes(content)
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail="Не удалось сохранить файл на сервере.",
        ) from e

    return {"url": f"/uploads/{filename}"}


def content_type_is_png(content_type: str | None) -> bool:
    return content_type in {"image/png", "image/x-png"}
