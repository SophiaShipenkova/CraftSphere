from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Product, Schedule, ScheduleEnrollment, SellerProfile, Service, User, UserRole
from app.schemas.product import ProductOut
from app.schemas.service import EnrollmentOut, ServiceOut
from app.utils.serializers import to_product_out, to_service_out
from app.schemas.user import MeOut, MeUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/enrollments", response_model=list[EnrollmentOut])
async def my_enrollments(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(
        select(ScheduleEnrollment)
        .where(ScheduleEnrollment.user_id == user.id)
        .options(selectinload(ScheduleEnrollment.schedule).selectinload(Schedule.service))
        .order_by(ScheduleEnrollment.created_at.desc())
    )
    result: list[EnrollmentOut] = []
    for row in rows.all():
        schedule = row.schedule
        service = schedule.service
        result.append(
            EnrollmentOut(
                id=row.id,
                schedule_id=schedule.id,
                service_id=service.id,
                service_title=service.title,
                start_time=schedule.start_time,
                end_time=schedule.end_time,
                location=schedule.location,
                created_at=row.created_at,
            )
        )
    return result


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    return MeOut(
        id=user.id,
        email=user.email,
        role=user.role.value,
        display_name=user.display_name,
        seller_profile_id=seller.id if seller else None,
        seller_name=seller.name if seller else None,
        seller_description=seller.description if seller else None,
        seller_location=seller.location if seller else None,
    )


@router.patch("/me", response_model=MeOut)
async def update_me(payload: MeUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip() or None

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if seller and user.role == UserRole.seller:
        if payload.seller_name is not None:
            seller.name = payload.seller_name.strip() or seller.name
        if payload.seller_description is not None:
            seller.description = payload.seller_description
        if payload.seller_location is not None:
            seller.location = payload.seller_location

    await db.commit()
    await db.refresh(user)
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))

    return MeOut(
        id=user.id,
        email=user.email,
        role=user.role.value,
        display_name=user.display_name,
        seller_profile_id=seller.id if seller else None,
        seller_name=seller.name if seller else None,
        seller_description=seller.description if seller else None,
        seller_location=seller.location if seller else None,
    )


@router.get("/me/products", response_model=list[ProductOut])
async def my_products(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if not seller:
        return []
    products = await db.scalars(
        select(Product)
        .where(Product.seller_id == seller.id)
        .options(selectinload(Product.tags))
        .order_by(Product.created_at.desc())
    )
    return [to_product_out(p) for p in products]


@router.get("/me/services", response_model=list[ServiceOut])
async def my_services(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if not seller:
        return []
    services = await db.scalars(
        select(Service)
        .where(Service.seller_id == seller.id)
        .options(selectinload(Service.tags))
        .order_by(Service.created_at.desc())
    )
    return [to_service_out(s) for s in services]
