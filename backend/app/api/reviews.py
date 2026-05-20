from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models import Product, Review, ReviewVote, SellerProfile, Service, User
from app.schemas.review import (
    ReviewCreate,
    ReviewOut,
    ReviewsListResponse,
    ReviewSummary,
    ReviewUpdate,
    ReviewVoteIn,
)
from app.services.review_stats import product_review_summary, service_review_summary

product_router = APIRouter(prefix="/products", tags=["reviews"])
service_router = APIRouter(prefix="/services", tags=["reviews"])
router = APIRouter(prefix="/reviews", tags=["reviews"])


def _author_name(user: User) -> str:
    return user.display_name or user.email.split("@")[0]


async def _review_to_out(review: Review, db: AsyncSession, user: User | None) -> ReviewOut:
    upvotes = int(
        await db.scalar(
            select(func.count()).select_from(ReviewVote).where(
                ReviewVote.review_id == review.id, ReviewVote.value == 1
            )
        )
        or 0
    )
    downvotes = int(
        await db.scalar(
            select(func.count()).select_from(ReviewVote).where(
                ReviewVote.review_id == review.id, ReviewVote.value == -1
            )
        )
        or 0
    )
    my_vote = None
    if user:
        my_vote = await db.scalar(
            select(ReviewVote.value).where(
                ReviewVote.review_id == review.id, ReviewVote.user_id == user.id
            )
        )

    author = review.author
    if not author:
        author = await db.get(User, review.author_id)

    return ReviewOut(
        id=review.id,
        author_name=_author_name(author) if author else "Пользователь",
        rating=review.rating,
        text=review.text or "",
        created_at=review.created_at,
        upvotes=upvotes,
        downvotes=downvotes,
        my_vote=my_vote,
        is_mine=bool(user and review.author_id == user.id),
    )


async def _list_reviews(
    db: AsyncSession,
    user: User | None,
    *,
    product_id: int | None = None,
    service_id: int | None = None,
) -> ReviewsListResponse:
    stmt = select(Review).options(selectinload(Review.author)).order_by(Review.created_at.desc())
    if product_id is not None:
        stmt = stmt.where(Review.product_id == product_id)
        avg_rating, count = await product_review_summary(db, product_id)
    else:
        stmt = stmt.where(Review.service_id == service_id)
        avg_rating, count = await service_review_summary(db, service_id)

    reviews = (await db.scalars(stmt)).all()
    items = [await _review_to_out(r, db, user) for r in reviews]
    return ReviewsListResponse(
        summary=ReviewSummary(avg_rating=avg_rating, count=count),
        items=items,
    )


async def _ensure_not_owner(
    db: AsyncSession, user: User, *, product_id: int | None = None, service_id: int | None = None
) -> None:
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if not seller:
        return
    if product_id is not None:
        owner = await db.scalar(select(Product.seller_id).where(Product.id == product_id))
        if owner == seller.id:
            raise HTTPException(status_code=400, detail="Cannot review your own product")
    if service_id is not None:
        owner = await db.scalar(select(Service.seller_id).where(Service.id == service_id))
        if owner == seller.id:
            raise HTTPException(status_code=400, detail="Cannot review your own service")


@product_router.get("/{product_id}/reviews", response_model=ReviewsListResponse)
async def list_product_reviews(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    exists = await db.scalar(select(Product.id).where(Product.id == product_id))
    if not exists:
        raise HTTPException(status_code=404, detail="Product not found")
    return await _list_reviews(db, user, product_id=product_id)


@product_router.post("/{product_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_product_review(
    product_id: int,
    payload: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.scalar(select(Product).where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await _ensure_not_owner(db, user, product_id=product_id)

    existing = await db.scalar(
        select(Review.id).where(Review.author_id == user.id, Review.product_id == product_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")

    review = Review(
        author_id=user.id,
        product_id=product_id,
        rating=payload.rating,
        text=payload.text.strip(),
    )
    db.add(review)
    await db.flush()
    review_id = review.id
    await db.commit()
    review = await db.scalar(
        select(Review).options(selectinload(Review.author)).where(Review.id == review_id)
    )
    return await _review_to_out(review, db, user)


@service_router.get("/{service_id}/reviews", response_model=ReviewsListResponse)
async def list_service_reviews(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    exists = await db.scalar(select(Service.id).where(Service.id == service_id))
    if not exists:
        raise HTTPException(status_code=404, detail="Service not found")
    return await _list_reviews(db, user, service_id=service_id)


@service_router.post("/{service_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_service_review(
    service_id: int,
    payload: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    await _ensure_not_owner(db, user, service_id=service_id)

    existing = await db.scalar(
        select(Review.id).where(Review.author_id == user.id, Review.service_id == service_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this service")

    review = Review(
        author_id=user.id,
        service_id=service_id,
        rating=payload.rating,
        text=payload.text.strip(),
    )
    db.add(review)
    await db.flush()
    review_id = review.id
    await db.commit()
    review = await db.scalar(
        select(Review).options(selectinload(Review.author)).where(Review.id == review_id)
    )
    return await _review_to_out(review, db, user)


@router.patch("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: int,
    payload: ReviewUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await db.scalar(
        select(Review).options(selectinload(Review.author)).where(Review.id == review_id)
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your review")

    if payload.rating is not None:
        review.rating = payload.rating
    if payload.text is not None:
        review.text = payload.text.strip()
    await db.commit()
    return await _review_to_out(review, db, user)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await db.scalar(select(Review).where(Review.id == review_id))
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your review")
    await db.delete(review)
    await db.commit()


@router.post("/{review_id}/vote", response_model=ReviewOut)
async def vote_review(
    review_id: int,
    payload: ReviewVoteIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await db.scalar(
        select(Review).options(selectinload(Review.author)).where(Review.id == review_id)
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.author_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot vote on your own review")

    vote = await db.scalar(
        select(ReviewVote).where(ReviewVote.review_id == review_id, ReviewVote.user_id == user.id)
    )
    if vote:
        if vote.value == payload.value:
            await db.delete(vote)
        else:
            vote.value = payload.value
    else:
        db.add(ReviewVote(review_id=review_id, user_id=user.id, value=payload.value))

    await db.commit()
    return await _review_to_out(review, db, user)
