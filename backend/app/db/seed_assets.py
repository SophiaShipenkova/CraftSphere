from app.core.paths import resolve_upload_dir

UPLOAD_DIR = resolve_upload_dir()

# Картинки берутся из репозитория (backend/data/uploads/)
# Порядок: для каждого продавца — cover, avatar, затем товары и мастер-классы
SEED_IMAGES = [
    # Leaves Studio
    "/uploads/leaves_cover.jpg",
    "/uploads/leaves_avatar.jpg",
    "/uploads/product_earrings.jpg",
    "/uploads/product_bracelet.jpg",
    "/uploads/product_pendant.jpg",
    "/uploads/mk_earrings.jpg",
    "/uploads/mk_bracelet.jpg",
    # ClayDream Studio
    "/uploads/clay_cover.jpg",
    "/uploads/clay_avatar.jpg",
    "/uploads/product_mug.jpg",
    "/uploads/product_plate.jpg",
    "/uploads/product_cups.jpg",
    "/uploads/mk_mug.jpg",
    "/uploads/mk_pottery.jpg",
    # KnitSoul
    "/uploads/knit_cover.jpg",
    "/uploads/knit_avatar.jpg",
    "/uploads/product_scarf.jpg",
    "/uploads/product_blanket.jpg",
    "/uploads/mk_knitting.jpg",
]


async def fetch_images(count: int) -> list[str]:
    return SEED_IMAGES[:count]
