from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import CartItem, Order, OrderItem, OrderStatus, Product, User, UserRole
from app.schemas.cart import CartAdd, CartItemOut, CartOut, CartUpdate
from app.schemas.order import OrderItemOut, OrderOut

router = APIRouter(prefix="/users/me", tags=["cart-orders"])


async def build_cart(user_id: int, db: AsyncSession) -> CartOut:
    rows = await db.scalars(
        select(CartItem).where(CartItem.user_id == user_id).options(selectinload(CartItem.product))
    )
    items: list[CartItemOut] = []
    total = 0.0
    count = 0
    for row in rows.all():
        product = row.product
        if not product:
            continue
        line = float(product.price) * row.quantity
        total += line
        count += row.quantity
        items.append(
            CartItemOut(
                product_id=product.id,
                title=product.title,
                price=float(product.price),
                quantity=row.quantity,
                image=(product.images or [None])[0],
                stock=product.stock,
            )
        )
    return CartOut(items=items, total=total, count=count)


def order_to_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        status=order.status.value,
        total=float(order.total),
        created_at=order.created_at,
        items=[
            OrderItemOut(
                product_id=i.product_id,
                title=i.title,
                price=float(i.price),
                quantity=i.quantity,
            )
            for i in order.items
        ],
    )


@router.get("/cart", response_model=CartOut)
async def get_cart(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await build_cart(user.id, db)


@router.post("/cart", response_model=CartOut)
async def add_cart_item(
    payload: CartAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < payload.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")

    existing = await db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == payload.product_id)
    )
    if existing:
        existing.quantity += payload.quantity
        if existing.quantity > product.stock:
            raise HTTPException(status_code=400, detail="Not enough stock")
    else:
        db.add(CartItem(user_id=user.id, product_id=payload.product_id, quantity=payload.quantity))
    await db.commit()
    return await build_cart(user.id, db)


@router.patch("/cart/{product_id}", response_model=CartOut)
async def update_cart_item(
    product_id: int,
    payload: CartUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.quantity > product.stock:
        raise HTTPException(status_code=400, detail="Not enough stock")

    item = await db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id)
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = payload.quantity
    await db.commit()
    return await build_cart(user.id, db)


@router.delete("/cart/{product_id}", response_model=CartOut)
async def remove_cart_item(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = await db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id)
    )
    if item:
        await db.delete(item)
        await db.commit()
    return await build_cart(user.id, db)


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.role != UserRole.buyer:
        raise HTTPException(status_code=403, detail="Only buyers can place orders")

    cart = await db.scalars(select(CartItem).where(CartItem.user_id == user.id))
    cart_rows = list(cart.all())
    if not cart_rows:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = 0.0
    order = Order(user_id=user.id, status=OrderStatus.pending_payment, total=0)
    db.add(order)
    await db.flush()

    for row in cart_rows:
        product = await db.get(Product, row.product_id)
        if not product or product.stock < row.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product.title if product else row.product_id}")
        product.stock -= row.quantity
        line_total = float(product.price) * row.quantity
        total += line_total
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                title=product.title,
                price=float(product.price),
                quantity=row.quantity,
            )
        )
        await db.delete(row)

    order.total = total
    await db.commit()
    await db.refresh(order, ["items"])
    return order_to_out(order)


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    orders = await db.scalars(
        select(Order).where(Order.user_id == user.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    )
    return [order_to_out(o) for o in orders.all()]


@router.post("/orders/{order_id}/pay", response_model=OrderOut)
async def pay_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(
        select(Order).where(Order.id == order_id, Order.user_id == user.id).options(selectinload(Order.items))
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.pending_payment:
        raise HTTPException(status_code=400, detail="Order is not pending payment")
    order.status = OrderStatus.paid
    await db.commit()
    await db.refresh(order, ["items"])
    return order_to_out(order)
