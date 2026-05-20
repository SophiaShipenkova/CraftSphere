from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Product, SellerProfile, Service, Tag

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(q: str, db: AsyncSession = Depends(get_db)):
    pattern = f"%{q.lower()}%"

    products = await db.scalars(
        select(Product).where(or_(Product.title.ilike(pattern), Product.description.ilike(pattern))).limit(20)
    )
    services = await db.scalars(
        select(Service).where(or_(Service.title.ilike(pattern), Service.description.ilike(pattern))).limit(20)
    )
    sellers = await db.scalars(select(SellerProfile).where(SellerProfile.name.ilike(pattern)).limit(20))
    tags = await db.scalars(select(Tag).where(Tag.name.ilike(pattern)).limit(20))

    return {
        "products": [{"id": p.id, "title": p.title, "price": float(p.price)} for p in products],
        "services": [{"id": s.id, "title": s.title, "price": float(s.price)} for s in services],
        "sellers": [{"id": s.id, "name": s.name, "location": s.location} for s in sellers],
        "tags": [{"id": t.id, "name": t.name} for t in tags],
    }
