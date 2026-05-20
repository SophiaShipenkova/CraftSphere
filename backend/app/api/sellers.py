from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models import BlogPost, Product, SellerProfile, SellerSubscription, Service, User, UserRole
from app.schemas.showcase import BlogPostOut, SellerShowcaseOut
from app.schemas.seller import SellerOut
from app.utils.serializers import to_product_out, to_service_out
from app.services.review_stats import product_review_summaries_for_ids, service_review_summaries_for_ids

router = APIRouter(prefix="/sellers", tags=["sellers"])


def seller_to_out(seller: SellerProfile, subscribed: bool = False) -> SellerOut:
    return SellerOut(
        id=seller.id,
        name=seller.name,
        description=seller.description,
        avatar=seller.avatar,
        cover_image=seller.cover_image,
        location=seller.location,
        created_at=seller.created_at,
        subscribed=subscribed,
    )


@router.get("", response_model=list[SellerOut])
async def list_sellers(db: AsyncSession = Depends(get_db)):
    sellers = await db.scalars(select(SellerProfile).order_by(SellerProfile.created_at.desc()))
    return [seller_to_out(s) for s in sellers.all()]


@router.get("/{seller_id}", response_model=SellerOut)
async def get_seller(
    seller_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.id == seller_id))
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    subscribed = False
    if user:
        sub = await db.scalar(
            select(SellerSubscription).where(
                SellerSubscription.user_id == user.id, SellerSubscription.seller_id == seller_id
            )
        )
        subscribed = sub is not None
    return seller_to_out(seller, subscribed=subscribed)


@router.get("/{seller_id}/showcase", response_model=SellerShowcaseOut)
async def get_showcase(
    seller_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.id == seller_id))
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    subscribed = False
    if user:
        sub = await db.scalar(
            select(SellerSubscription).where(
                SellerSubscription.user_id == user.id, SellerSubscription.seller_id == seller_id
            )
        )
        subscribed = sub is not None

    product_list = list((await db.scalars(
        select(Product).where(Product.seller_id == seller_id).options(selectinload(Product.tags))
    )).all())
    service_list = list((await db.scalars(
        select(Service).where(Service.seller_id == seller_id).options(selectinload(Service.tags))
    )).all())
    posts = await db.scalars(
        select(BlogPost).where(BlogPost.seller_id == seller_id).order_by(BlogPost.created_at.desc())
    )

    prod_ratings = await product_review_summaries_for_ids(db, [p.id for p in product_list])
    serv_ratings = await service_review_summaries_for_ids(db, [s.id for s in service_list])

    return SellerShowcaseOut(
        seller=seller_to_out(seller, subscribed=subscribed),
        products=[
            to_product_out(
                p,
                avg_rating=prod_ratings.get(p.id, (None, 0))[0],
                review_count=prod_ratings.get(p.id, (None, 0))[1],
            )
            for p in product_list
        ],
        services=[
            to_service_out(
                s,
                avg_rating=serv_ratings.get(s.id, (None, 0))[0],
                review_count=serv_ratings.get(s.id, (None, 0))[1],
            )
            for s in service_list
        ],
        blog_posts=[BlogPostOut.model_validate(p) for p in posts.all()],
    )


@router.post("/{seller_id}/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe(
    seller_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != UserRole.buyer:
        raise HTTPException(status_code=403, detail="Only buyers can subscribe")
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.id == seller_id))
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    if seller.user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot subscribe to yourself")
    existing = await db.scalar(
        select(SellerSubscription).where(
            SellerSubscription.user_id == user.id, SellerSubscription.seller_id == seller_id
        )
    )
    if not existing:
        db.add(SellerSubscription(user_id=user.id, seller_id=seller_id))
        await db.commit()
    return {"ok": True}


@router.delete("/{seller_id}/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    seller_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await db.scalar(
        select(SellerSubscription).where(
            SellerSubscription.user_id == user.id, SellerSubscription.seller_id == seller_id
        )
    )
    if sub:
        await db.delete(sub)
        await db.commit()
