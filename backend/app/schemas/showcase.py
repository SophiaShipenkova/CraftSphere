from datetime import datetime

from pydantic import BaseModel

from app.schemas.product import ProductOut
from app.schemas.service import ServiceOut
from app.schemas.seller import SellerOut


class BlogPostOut(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SellerShowcaseOut(BaseModel):
    seller: SellerOut
    products: list[ProductOut]
    services: list[ServiceOut]
    blog_posts: list[BlogPostOut]
