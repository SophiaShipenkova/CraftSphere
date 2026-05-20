from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Review


async def product_review_summary(db: AsyncSession, product_id: int) -> tuple[float | None, int]:
    avg_val, count = (
        await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(Review.product_id == product_id)
        )
    ).one()
    if not count:
        return None, 0
    return round(float(avg_val), 1), int(count)


async def service_review_summary(db: AsyncSession, service_id: int) -> tuple[float | None, int]:
    avg_val, count = (
        await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(Review.service_id == service_id)
        )
    ).one()
    if not count:
        return None, 0
    return round(float(avg_val), 1), int(count)


async def product_review_summaries_for_ids(db: AsyncSession, product_ids: Sequence[int]) -> dict[int, tuple[float | None, int]]:
    ids = list(dict.fromkeys(product_ids))
    if not ids:
        return {}
    stmt = (
        select(Review.product_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.product_id.in_(ids))
        .group_by(Review.product_id)
    )
    rows = (await db.execute(stmt)).all()
    out: dict[int, tuple[float | None, int]] = {pid: (None, 0) for pid in ids}
    for pid, avg_val, cnt in rows:
        if not cnt:
            continue
        out[int(pid)] = (round(float(avg_val), 1), int(cnt))
    return out


async def service_review_summaries_for_ids(db: AsyncSession, service_ids: Sequence[int]) -> dict[int, tuple[float | None, int]]:
    ids = list(dict.fromkeys(service_ids))
    if not ids:
        return {}
    stmt = (
        select(Review.service_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.service_id.in_(ids))
        .group_by(Review.service_id)
    )
    rows = (await db.execute(stmt)).all()
    out: dict[int, tuple[float | None, int]] = {sid: (None, 0) for sid in ids}
    for sid, avg_val, cnt in rows:
        if not cnt:
            continue
        out[int(sid)] = (round(float(avg_val), 1), int(cnt))
    return out
