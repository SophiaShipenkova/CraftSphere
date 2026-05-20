from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models import BlogPost, Product, SellerProfile, Service
from app.services.review_stats import product_review_summaries_for_ids, service_review_summaries_for_ids

router = APIRouter(prefix="/home", tags=["home"])


@router.get("")
async def home(db: AsyncSession = Depends(get_db)):
    services = (await db.scalars(select(Service).options(selectinload(Service.tags)).order_by(Service.created_at.desc()).limit(6))).all()
    products = (await db.scalars(select(Product).options(selectinload(Product.tags)).order_by(Product.created_at.desc()).limit(8))).all()
    stories = await db.scalars(select(BlogPost).order_by(BlogPost.created_at.desc()).limit(5))
    sellers = await db.scalars(select(SellerProfile).order_by(SellerProfile.created_at.desc()).limit(6))

    prod_rating_map = await product_review_summaries_for_ids(db, [p.id for p in products])
    serv_rating_map = await service_review_summaries_for_ids(db, [s.id for s in services])

    return {
        "popular_services": [
            {
                "id": s.id,
                "seller_id": s.seller_id,
                "title": s.title,
                "description": s.description,
                "price": float(s.price),
                "duration": s.duration,
                "images": s.images or [],
                "tags": [t.name for t in s.tags],
                "created_at": s.created_at,
                "avg_rating": serv_rating_map.get(s.id, (None, 0))[0],
                "review_count": serv_rating_map.get(s.id, (None, 0))[1],
            }
            for s in services
        ],
        "new_products": [
            {
                "id": p.id,
                "seller_id": p.seller_id,
                "title": p.title,
                "description": p.description,
                "price": float(p.price),
                "images": p.images or [],
                "tags": [t.name for t in p.tags],
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "avg_rating": prod_rating_map.get(p.id, (None, 0))[0],
                "review_count": prod_rating_map.get(p.id, (None, 0))[1],
            }
            for p in products
        ],
        "stories": [{"id": b.id, "title": b.title, "content": b.content[:160]} for b in stories],
        "nearby_sellers": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "avatar": s.avatar,
                "location": s.location,
                "created_at": s.created_at,
            }
            for s in sellers
        ],
    }
