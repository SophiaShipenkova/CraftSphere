from datetime import datetime

from pydantic import BaseModel


class SellerOut(BaseModel):
    id: int
    name: str
    description: str
    avatar: str | None
    cover_image: str | None = None
    location: str | None
    created_at: datetime
    subscribed: bool = False

    class Config:
        from_attributes = True
