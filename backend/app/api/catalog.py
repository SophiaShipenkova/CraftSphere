from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models import Product, SellerProfile, Service, Tag
from app.models.models import product_tags
from app.schemas.catalog import CatalogCategory, CatalogItem, CatalogResponse

from app.services.review_stats import product_review_summaries_for_ids, service_review_summaries_for_ids

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("", response_model=CatalogResponse)
async def catalog(
    type: str = Query("all", pattern="^(all|products|services)$"),
    tag: str | None = None,
    q: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    location: str | None = None,
    sort: str = Query("new", pattern="^(new|price_asc|price_desc)$"),
    db: AsyncSession = Depends(get_db),
):
    tag_name = tag.strip().lower() if tag else None
    query_text = f"%{q.lower()}%" if q and q.strip() else None

    tag_counts = await db.execute(
        select(Tag.name, func.count(product_tags.c.product_id))
        .join(product_tags, Tag.id == product_tags.c.tag_id)
        .group_by(Tag.name)
        .order_by(func.count(product_tags.c.product_id).desc())
    )
    categories = [CatalogCategory(name=row[0], count=row[1]) for row in tag_counts.all()]

    product_rows: list[Product] = []
    service_rows: list[Service] = []

    if type in ("all", "products"):
        stmt = (
            select(Product)
            .join(SellerProfile, Product.seller_id == SellerProfile.id)
            .options(selectinload(Product.tags), selectinload(Product.seller))
        )
        if tag_name:
            stmt = stmt.join(Product.tags).where(Tag.name == tag_name)
        if query_text:
            stmt = stmt.where(or_(Product.title.ilike(query_text), Product.description.ilike(query_text)))
        if min_price is not None:
            stmt = stmt.where(Product.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(Product.price <= max_price)
        if location:
            stmt = stmt.where(SellerProfile.location.ilike(f"%{location}%"))
        if sort == "price_asc":
            stmt = stmt.order_by(Product.price.asc())
        elif sort == "price_desc":
            stmt = stmt.order_by(Product.price.desc())
        else:
            stmt = stmt.order_by(Product.created_at.desc())

        product_rows = list((await db.scalars(stmt)).all())

    if type in ("all", "services"):
        stmt = (
            select(Service)
            .join(SellerProfile, Service.seller_id == SellerProfile.id)
            .options(selectinload(Service.tags), selectinload(Service.seller))
        )
        if tag_name:
            stmt = stmt.join(Service.tags).where(Tag.name == tag_name)
        if query_text:
            stmt = stmt.where(or_(Service.title.ilike(query_text), Service.description.ilike(query_text)))
        if min_price is not None:
            stmt = stmt.where(Service.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(Service.price <= max_price)
        if location:
            stmt = stmt.where(SellerProfile.location.ilike(f"%{location}%"))
        if sort == "price_asc":
            stmt = stmt.order_by(Service.price.asc())
        elif sort == "price_desc":
            stmt = stmt.order_by(Service.price.desc())
        else:
            stmt = stmt.order_by(Service.created_at.desc())

        service_rows = list((await db.scalars(stmt)).all())

    prod_ratings = await product_review_summaries_for_ids(db, [p.id for p in product_rows])
    serv_ratings = await service_review_summaries_for_ids(db, [s.id for s in service_rows])

    items: list[CatalogItem] = []

    for p in product_rows:
        avg_r, _ = prod_ratings.get(p.id, (None, 0))
        items.append(
            CatalogItem(
                kind="product",
                id=p.id,
                title=p.title,
                price=float(p.price),
                image=(p.images or [None])[0],
                seller_name=p.seller.name,
                seller_id=p.seller_id,
                tags=[t.name for t in p.tags],
                description=(p.description or "")[:220],
                duration=None,
                avg_rating=avg_r,
            )
        )

    for s in service_rows:
        avg_r, _ = serv_ratings.get(s.id, (None, 0))
        items.append(
            CatalogItem(
                kind="service",
                id=s.id,
                title=s.title,
                price=float(s.price),
                image=(s.images or [None])[0],
                seller_name=s.seller.name,
                seller_id=s.seller_id,
                tags=[t.name for t in s.tags],
                description=(s.description or "")[:220],
                duration=s.duration,
                avg_rating=avg_r,
            )
        )

    if sort == "price_asc":
        items.sort(key=lambda x: x.price)
    elif sort == "price_desc":
        items.sort(key=lambda x: x.price, reverse=True)

    return CatalogResponse(categories=categories, items=items, total=len(items))
