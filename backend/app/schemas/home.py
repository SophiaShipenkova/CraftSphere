from pydantic import BaseModel

from app.schemas.product import ProductOut
from app.schemas.service import ServiceOut
from app.schemas.seller import SellerOut


class HomeResponse(BaseModel):
    popular_services: list[ServiceOut]
    new_products: list[ProductOut]
    stories: list[dict]
    nearby_sellers: list[SellerOut]
