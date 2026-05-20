from pydantic import BaseModel, Field


class CartItemOut(BaseModel):
    product_id: int
    title: str
    price: float
    quantity: int
    image: str | None
    stock: int


class CartOut(BaseModel):
    items: list[CartItemOut]
    total: float
    count: int


class CartAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartUpdate(BaseModel):
    quantity: int = Field(ge=1)
