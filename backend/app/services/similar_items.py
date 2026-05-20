from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Product, SellerProfile, Service
from app.models.models import product_tags, service_tags
from app.schemas.catalog import CatalogItem
from app.services.review_stats import product_review_summary, service_review_summary


async def _product_to_catalog_item(db: AsyncSession, product: Product) -> CatalogItem:
    avg_rating, _ = await product_review_summary(db, product.id)
    return CatalogItem(
        kind="product",
        id=product.id,
        title=product.title,
        price=float(product.price),
        image=(product.images or [None])[0],
        seller_name=product.seller.name,
        seller_id=product.seller_id,
        tags=[t.name for t in product.tags],
        avg_rating=avg_rating,
    )


async def _service_to_catalog_item(db: AsyncSession, service: Service) -> CatalogItem:
    avg_rating, _ = await service_review_summary(db, service.id)
    return CatalogItem(
        kind="service",
        id=service.id,
        title=service.title,
        price=float(service.price),
        image=(service.images or [None])[0],
        seller_name=service.seller.name,
        seller_id=service.seller_id,
        tags=[t.name for t in service.tags],
        avg_rating=avg_rating,
    )


async def _load_scored_entities(
    db: AsyncSession,
    *,
    tag_ids: list[int],
    exclude_product_id: int | None = None,
    exclude_service_id: int | None = None,
    seller_id: int | None = None,
    limit: int,
) -> list[CatalogItem]:
    scored: dict[tuple[str, int], tuple[int, Product | Service]] = {}

    if tag_ids:
        product_stmt = (
            select(Product, func.count(product_tags.c.tag_id).label("score"))
            .join(product_tags, Product.id == product_tags.c.product_id)
            .options(selectinload(Product.tags), selectinload(Product.seller))
            .where(product_tags.c.tag_id.in_(tag_ids))
            .group_by(Product.id)
        )
        if exclude_product_id is not None:
            product_stmt = product_stmt.where(Product.id != exclude_product_id)
        for product, score in (await db.execute(product_stmt)).all():
            key = ("product", product.id)
            if key not in scored or scored[key][0] < int(score):
                scored[key] = (int(score), product)

        service_stmt = (
            select(Service, func.count(service_tags.c.tag_id).label("score"))
            .join(service_tags, Service.id == service_tags.c.service_id)
            .options(selectinload(Service.tags), selectinload(Service.seller))
            .where(service_tags.c.tag_id.in_(tag_ids))
            .group_by(Service.id)
        )
        if exclude_service_id is not None:
            service_stmt = service_stmt.where(Service.id != exclude_service_id)
        for service, score in (await db.execute(service_stmt)).all():
            key = ("service", service.id)
            if key not in scored or scored[key][0] < int(score):
                scored[key] = (int(score), service)

    if len(scored) < limit and seller_id is not None:
        product_stmt = (
            select(Product)
            .options(selectinload(Product.tags), selectinload(Product.seller))
            .where(Product.seller_id == seller_id)
            .order_by(Product.created_at.desc())
            .limit(limit)
        )
        if exclude_product_id is not None:
            product_stmt = product_stmt.where(Product.id != exclude_product_id)
        for product in (await db.scalars(product_stmt)).all():
            key = ("product", product.id)
            if key not in scored:
                scored[key] = (0, product)

        service_stmt = (
            select(Service)
            .options(selectinload(Service.tags), selectinload(Service.seller))
            .where(Service.seller_id == seller_id)
            .order_by(Service.created_at.desc())
            .limit(limit)
        )
        if exclude_service_id is not None:
            service_stmt = service_stmt.where(Service.id != exclude_service_id)
        for service in (await db.scalars(service_stmt)).all():
            key = ("service", service.id)
            if key not in scored:
                scored[key] = (0, service)

    prefer_service = exclude_service_id is not None

    def sort_key(item: tuple[tuple[str, int], tuple[int, Product | Service]]) -> tuple:
        kind, _eid = item[0]
        score, entity = item[1]
        kind_rank = 0 if (kind == "service") == prefer_service else 1
        created = getattr(entity, "created_at", None)
        return (-score, kind_rank, -(created.timestamp() if created else 0))

    top = sorted(scored.items(), key=sort_key)[:limit]
    result: list[CatalogItem] = []
    for _, (_, entity) in top:
        if isinstance(entity, Product):
            result.append(await _product_to_catalog_item(db, entity))
        else:
            result.append(await _service_to_catalog_item(db, entity))
    return result


async def similar_for_product(db: AsyncSession, product_id: int, limit: int = 12) -> list[CatalogItem]:
    product = await db.scalar(
        select(Product).options(selectinload(Product.tags)).where(Product.id == product_id)
    )
    if not product:
        return []
    return await _load_scored_entities(
        db,
        tag_ids=[t.id for t in product.tags],
        exclude_product_id=product_id,
        seller_id=product.seller_id,
        limit=limit,
    )


async def similar_for_service(db: AsyncSession, service_id: int, limit: int = 12) -> list[CatalogItem]:
    service = await db.scalar(
        select(Service).options(selectinload(Service.tags)).where(Service.id == service_id)
    )
    if not service:
        return []
    return await _load_scored_entities(
        db,
        tag_ids=[t.id for t in service.tags],
        exclude_service_id=service_id,
        seller_id=service.seller_id,
        limit=limit,
    )
