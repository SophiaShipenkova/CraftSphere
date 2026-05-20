from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.api.schedules import schedule_to_out
from app.models import Schedule, ScheduleEnrollment, SellerProfile, Service, Tag, User, UserRole
from app.schemas.catalog import CatalogItem
from app.schemas.service import ScheduleCreate, ScheduleOut, ScheduleUpdate, ServiceCreate, ServiceOut, ServiceUpdate
from app.services.review_stats import service_review_summary
from app.services.similar_items import similar_for_service
from app.utils.serializers import to_service_out

router = APIRouter(prefix="/services", tags=["services"])


async def load_service(db: AsyncSession, service_id: int) -> Service:
    service = await db.scalar(
        select(Service).options(selectinload(Service.tags)).where(Service.id == service_id)
    )
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


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


@router.get("", response_model=list[ServiceOut])
async def list_services(db: AsyncSession = Depends(get_db)):
    services = await db.scalars(
        select(Service).options(selectinload(Service.tags)).order_by(Service.created_at.desc())
    )
    return [to_service_out(s) for s in services.all()]


@router.get("/{service_id}/similar", response_model=list[CatalogItem])
async def get_similar_services(
    service_id: int,
    limit: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    items = await similar_for_service(db, service_id, limit)
    if not items and not await db.scalar(select(Service.id).where(Service.id == service_id)):
        raise HTTPException(status_code=404, detail="Service not found")
    return items


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)):
    service = await db.scalar(select(Service).options(selectinload(Service.tags)).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    avg_rating, review_count = await service_review_summary(db, service_id)
    return to_service_out(service, avg_rating=avg_rating, review_count=review_count)


@router.post("", response_model=ServiceOut)
async def create_service(
    payload: ServiceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != UserRole.seller:
        raise HTTPException(status_code=403, detail="Only sellers can create services")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")

    service = Service(
        seller_id=seller.id,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        duration=payload.duration,
        images=payload.images,
    )
    service.tags = await get_or_create_tags(db, payload.tags)
    db.add(service)
    await db.flush()
    service_id = service.id
    await db.commit()
    service = await load_service(db, service_id)
    avg_rating, review_count = await service_review_summary(db, service_id)
    return to_service_out(service, avg_rating=avg_rating, review_count=review_count)


@router.patch("/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: int,
    payload: ServiceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await db.scalar(select(Service).options(selectinload(Service.tags)).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")

    data = payload.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)
    for key, value in data.items():
        setattr(service, key, value)
    if tags is not None:
        service.tags = await get_or_create_tags(db, tags)

    await db.commit()
    service = await load_service(db, service_id)
    avg_rating, review_count = await service_review_summary(db, service_id)
    return to_service_out(service, avg_rating=avg_rating, review_count=review_count)


@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(service)
    await db.commit()
    return {"ok": True}


@router.post("/{service_id}/schedule", response_model=ScheduleOut)
async def create_schedule(
    service_id: int,
    payload: ScheduleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = await db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")

    schedule = Schedule(
        service_id=service_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        seats=payload.seats,
        location=payload.location,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule_to_out(schedule, 0)


@router.patch("/{service_id}/schedule/{schedule_id}", response_model=ScheduleOut)
async def update_schedule(
    service_id: int,
    schedule_id: int,
    payload: ScheduleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schedule = await db.scalar(select(Schedule).where(Schedule.id == schedule_id, Schedule.service_id == service_id))
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    service = await db.scalar(select(Service).where(Service.id == service_id))
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or not service or service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(schedule, key, value)
    if schedule.end_time <= schedule.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    await db.commit()
    await db.refresh(schedule)
    booked = await db.scalar(
        select(func.count()).select_from(ScheduleEnrollment).where(ScheduleEnrollment.schedule_id == schedule_id)
    )
    return schedule_to_out(schedule, int(booked or 0))


@router.get("/{service_id}/schedule", response_model=list[ScheduleOut])
async def list_schedule(service_id: int, db: AsyncSession = Depends(get_db)):
    schedules = (await db.scalars(
        select(Schedule).where(Schedule.service_id == service_id).order_by(Schedule.start_time.asc())
    )).all()
    result: list[ScheduleOut] = []
    for s in schedules:
        booked = await db.scalar(
            select(func.count()).select_from(ScheduleEnrollment).where(ScheduleEnrollment.schedule_id == s.id)
        )
        result.append(schedule_to_out(s, int(booked or 0)))
    return result


@router.delete("/{service_id}/schedule/{schedule_id}", status_code=204)
async def delete_schedule(
    service_id: int,
    schedule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schedule = await db.scalar(select(Schedule).where(Schedule.id == schedule_id, Schedule.service_id == service_id))
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    service = await db.scalar(select(Service).where(Service.id == service_id))
    seller = await db.scalar(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if user.role != UserRole.seller or not seller or not service or service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(schedule)
    await db.commit()
