from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class OrderStatusStr(str, Enum):
    pending_payment = "pending_payment"
    paid = "paid"
    cancelled = "cancelled"


class OrderItemOut(BaseModel):
    product_id: int | None
    title: str
    price: float
    quantity: int


class OrderOut(BaseModel):
    id: int
    status: str
    total: float
    created_at: datetime
    items: list[OrderItemOut]
