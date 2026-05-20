from datetime import datetime

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    title: str
    description: str = ""
    price: float = Field(gt=0)
    duration: int = Field(gt=0)
    images: list[str] = []
    tags: list[str] = []


class ServiceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    duration: int | None = Field(default=None, gt=0)
    images: list[str] | None = None
    tags: list[str] | None = None


class ServiceOut(BaseModel):
    id: int
    seller_id: int
    title: str
    description: str
    price: float
    duration: int
    images: list[str]
    tags: list[str]
    avg_rating: float | None = None
    review_count: int = 0
    created_at: datetime


class ScheduleCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    seats: int = Field(gt=0)
    location: str


class ScheduleUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    seats: int | None = Field(default=None, gt=0)
    location: str | None = None


class ScheduleOut(BaseModel):
    id: int
    service_id: int
    start_time: datetime
    end_time: datetime
    seats: int
    seats_booked: int = 0
    seats_available: int = 0
    location: str

    class Config:
        from_attributes = True


class EnrollmentOut(BaseModel):
    id: int
    schedule_id: int
    service_id: int
    service_title: str
    start_time: datetime
    end_time: datetime
    location: str
    created_at: datetime
