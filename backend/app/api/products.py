from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Product, SellerProfile, Tag, User, UserRole
from app.schemas.catalog import CatalogItem
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.review_stats import product_review_summary
from app.services.similar_items import similar_for_product
from app.utils.serializers import to_product_out

router = APIRouter(prefix="/products", tags=["products"])


async def load_product(db: AsyncSession, product_id: int) -> Product:
    product = await db.scalar(
        select(Product).options(selectinload(Product.tags)).where(Product.id == product_id)
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


async def get_or_create_tags(db: AsyncSession, names: list[str]) -> list[Tag]:
    result: list[Tag] = []
    for raw_name in names:
        name = raw_name.strip().lower()
        if not name:
            continue
        tag = await db.scalar(select(Tag).where(Tag.name == name))
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            await db.flush()
        result.append(tag)
    return result


@router.get("", response_model=list[ProductOut])
async def list_products(db: AsyncSession = Depends(get_db)):
    products = await db.scalars(
        select(Product).options(selectinload(Product.tags)).order_by(Product.created_at.desc())
    )
    return [to_product_out(p) for p in products.all()]


@router.get("/{product_id}/similar", response_model=list[CatalogItem])
async def get_similar_products(
    product_id: int,
    limit: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    items = await similar_for_product(db, product_id, limit)
    if not items and not await db.scalar(select(Product.id).where(Product.id == product_id)):
        raise HTTPException(status_code=404, detail="Product not found")
    return items


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.scalar(select(Product).options(selectinload(Product.tags)).where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    avg_rating, review_count = await product_review_summary(db, product_id)
    return to_product_out(product, avg_rating=avg_rating, review_count=review_count)


@router.post("", response_model=ProductOut)
async def create_product(
    payload: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != UserRole.seller:
        raise HTTPException(status_code=403, detail="Only sellers can create products")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")

    product = Product(
        seller_id=seller.id,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        stock=payload.stock,
        images=payload.images,
    )
    product.tags = await get_or_create_tags(db, payload.tags)
    db.add(product)
    await db.flush()
    product_id = product.id
    await db.commit()
    product = await load_product(db, product_id)
    avg_rating, review_count = await product_review_summary(db, product_id)
    return to_product_out(product, avg_rating=avg_rating, review_count=review_count)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.scalar(select(Product).options(selectinload(Product.tags)).where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or product.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")

    data = payload.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)
    for key, value in data.items():
        setattr(product, key, value)
    if tags is not None:
        product.tags = await get_or_create_tags(db, tags)

    await db.commit()
    product = await load_product(db, product_id)
    avg_rating, review_count = await product_review_summary(db, product_id)
    return to_product_out(product, avg_rating=avg_rating, review_count=review_count)


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.scalar(select(Product).where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or product.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(product)
    await db.commit()
    return {"ok": True}
