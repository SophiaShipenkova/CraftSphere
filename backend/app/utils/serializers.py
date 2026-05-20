from app.models import Product, Service
from app.schemas.product import ProductOut
from app.schemas.service import ServiceOut


def to_product_out(
    product: Product,
    *,
    avg_rating: float | None = None,
    review_count: int = 0,
) -> ProductOut:
    return ProductOut(
        id=product.id,
        seller_id=product.seller_id,
        title=product.title,
        description=product.description,
        price=float(product.price),
        stock=product.stock,
        images=product.images or [],
        tags=[t.name for t in product.tags],
        avg_rating=avg_rating,
        review_count=review_count,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def to_service_out(
    service: Service,
    *,
    avg_rating: float | None = None,
    review_count: int = 0,
) -> ServiceOut:
    return ServiceOut(
        id=service.id,
        seller_id=service.seller_id,
        title=service.title,
        description=service.description,
        price=float(service.price),
        duration=service.duration,
        images=service.images or [],
        tags=[t.name for t in service.tags],
        avg_rating=avg_rating,
        review_count=review_count,
        created_at=service.created_at,
    )
