from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Schedule, ScheduleEnrollment, Service, User, UserRole
from app.schemas.service import EnrollmentOut, ScheduleOut

router = APIRouter(prefix="/schedules", tags=["schedules"])


def schedule_to_out(schedule: Schedule, booked: int) -> ScheduleOut:
    return ScheduleOut(
        id=schedule.id,
        service_id=schedule.service_id,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        seats=schedule.seats,
        seats_booked=booked,
        seats_available=max(0, schedule.seats - booked),
        location=schedule.location,
    )


@router.post("/{schedule_id}/book", status_code=status.HTTP_201_CREATED)
async def book_schedule(
    schedule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != UserRole.buyer:
        raise HTTPException(status_code=403, detail="Only buyers can book master classes")

    schedule = await db.scalar(select(Schedule).where(Schedule.id == schedule_id))
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule slot not found")

    booked = await db.scalar(
        select(func.count()).select_from(ScheduleEnrollment).where(ScheduleEnrollment.schedule_id == schedule_id)
    )
    if booked >= schedule.seats:
        raise HTTPException(status_code=409, detail="No seats available")

    existing = await db.scalar(
        select(ScheduleEnrollment).where(
            ScheduleEnrollment.schedule_id == schedule_id, ScheduleEnrollment.user_id == user.id
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled")

    db.add(ScheduleEnrollment(schedule_id=schedule_id, user_id=user.id))
    await db.commit()
    return {"ok": True}


@router.delete("/{schedule_id}/book", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    schedule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollment = await db.scalar(
        select(ScheduleEnrollment).where(
            ScheduleEnrollment.schedule_id == schedule_id, ScheduleEnrollment.user_id == user.id
        )
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    await db.delete(enrollment)
    await db.commit()
