from pydantic import BaseModel


class MeOut(BaseModel):
    id: int
    email: str
    role: str
    display_name: str | None
    seller_profile_id: int | None = None
    seller_name: str | None = None
    seller_description: str | None = None
    seller_location: str | None = None


class MeUpdate(BaseModel):
    display_name: str | None = None
    seller_name: str | None = None
    seller_description: str | None = None
    seller_location: str | None = None
