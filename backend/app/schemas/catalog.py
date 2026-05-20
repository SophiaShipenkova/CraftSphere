from pydantic import BaseModel


class CatalogCategory(BaseModel):
    name: str
    count: int


class CatalogItem(BaseModel):
    kind: str
    id: int
    title: str
    price: float
    image: str | None
    seller_name: str
    seller_id: int
    tags: list[str]
    description: str = ""
    duration: int | None = None
    avg_rating: float | None = None


class CatalogResponse(BaseModel):
    categories: list[CatalogCategory]
    items: list[CatalogItem]
    total: int
