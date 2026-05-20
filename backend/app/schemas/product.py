from datetime import datetime

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    title: str
    description: str = ""
    price: float = Field(gt=0)
    stock: int = Field(default=10, ge=0)
    images: list[str] = []
    tags: list[str] = []


class ProductUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    images: list[str] | None = None
    tags: list[str] | None = None


class ProductOut(BaseModel):
    id: int
    seller_id: int
    title: str
    description: str
    price: float
    stock: int = 10
    images: list[str]
    tags: list[str]
    avg_rating: float | None = None
    review_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
