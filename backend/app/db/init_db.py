import asyncio
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app.core.security import hash_password
from app.db.base import Base
from app.db.seed_assets import fetch_images
from app.db.session import SessionLocal, engine
from app.models import BlogPost, Product, Review, ReviewVote, Schedule, SellerProfile, Service, Tag, User, UserRole


async def create_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_or_create_tag(name: str, session):
    name = name.strip().lower()
    tag = await session.scalar(select(Tag).where(Tag.name == name))
    if not tag:
        tag = Tag(name=name)
        session.add(tag)
        await session.flush()
    return tag


async def seed_demo_data() -> None:
    async with SessionLocal() as session:
        if os.getenv("SEED_RESET") == "1":
            await session.execute(text("TRUNCATE users RESTART IDENTITY CASCADE"))
            await session.commit()

        any_user = await session.scalar(select(User.id).limit(1))
        if any_user:
            return

        images = await fetch_images(24)
        img = iter(images + [None] * 50)

        buyer = User(
            email="buyer@example.com",
            display_name="Анна Покупатель",
            password_hash=hash_password("password123"),
            role=UserRole.buyer,
        )
        session.add(buyer)
        await session.flush()

        sellers_data = [
            {
                "email": "leaves@example.com",
                "name": "Leaves Studio",
                "location": "Санкт-Петербург",
                "description": "Студия handmade-украшений и декора из натуральных материалов. Мы сочетаем камни, металл и живые текстуры — каждое изделие уникально.",
                "products": [
                    (
                        "Серьги из зелёного авантюрина и яшмы",
                        "Серьги ручной работы из авантюрина, яшмы и меди. Лёгкие, с натуральным блеском камня.",
                        2000,
                        7,
                        ["украшения", "камни"],
                    ),
                    (
                        "Браслет из яшмы и оникса",
                        "Браслет на резинке с подборкой камней в зелёно-чёрной гамме.",
                        2400,
                        5,
                        ["украшения", "камни"],
                    ),
                    (
                        "Кулон «Лист» из меди",
                        "Патинированный кулон в форме листа на шнуре из вощёного хлопка.",
                        1800,
                        10,
                        ["украшения"],
                    ),
                ],
                "services": [
                    (
                        "Мастер-класс: серьги из натуральных камней",
                        "За 2 часа создадите пару серёг из камней и фурнитуры. Все материалы включены.",
                        4000,
                        120,
                        ["украшения", "для начинающих"],
                    ),
                    (
                        "Вечерний МК: сборка браслета",
                        "Подбор камней, сборка и финишная обработка. Группа до 8 человек.",
                        3500,
                        90,
                        ["украшения", "практика"],
                    ),
                ],
                "posts": [
                    ("Как мы выбираем камни для коллекции", "Каждый камень проходит отбор по оттенку и фактуре. Мы работаем с поставщиками из Урала и Карелии."),
                    ("Закулисье Leaves Studio", "Показываем рабочий стол, инструменты и процесс сборки серёг перед отправкой клиенту."),
                ],
            },
            {
                "email": "claydream@example.com",
                "name": "ClayDream Studio",
                "location": "Санкт-Петербург",
                "description": "Гончарная мастерская: керамика для дома и авторские мастер-классы для начинающих.",
                "products": [
                    (
                        "Керамическая кружка «Лес»",
                        "Кружка с ручкой-веткой и росписью деревьев. Объём 350 мл, пищевая глазурь.",
                        1800,
                        6,
                        ["керамика", "дом"],
                    ),
                    (
                        "Тарелка ручной лепки",
                        "Декоративная тарелка 24 см, подходит для сервировки.",
                        2100,
                        4,
                        ["керамика"],
                    ),
                    (
                        "Набор чайных чашек",
                        "Две чашки в паре, матовая глазурь, тёплый бежевый тон.",
                        3500,
                        3,
                        ["керамика", "подарок"],
                    ),
                ],
                "services": [
                    (
                        "Мастер-класс: керамическая кружка вручную",
                        "Создание и роспись кружки под руководством мастера. Обжиг включён.",
                        4000,
                        150,
                        ["керамика", "для начинающих"],
                    ),
                    (
                        "Основы гончарного круга",
                        "Знакомство с кругом, центровка и первые формы.",
                        2900,
                        120,
                        ["керамика", "для начинающих"],
                    ),
                ],
                "posts": [
                    ("Почему керамика успокаивает", "Работа с глиной снижает стресс — рассказываем, что происходит на МК."),
                ],
            },
            {
                "email": "knitsoul@example.com",
                "name": "KnitSoul",
                "location": "Москва",
                "description": "Тёплые вещи ручной работы и уютные мастер-классы по вязанию.",
                "products": [
                    (
                        "Вязаный шарф из мериноса",
                        "Мягкий шарф 180×30 см, ручная вязка спицами.",
                        1600,
                        8,
                        ["вязание", "одежда"],
                    ),
                    (
                        "Шерстяной плед",
                        "Плед 120×150 см, смешанная шерсть, натуральные оттенки.",
                        4200,
                        2,
                        ["вязание", "дом"],
                    ),
                ],
                "services": [
                    (
                        "Вязание спицами для новичков",
                        "Научимся набирать петли и связать первый образец за одно занятие.",
                        1900,
                        120,
                        ["вязание", "для начинающих"],
                    ),
                ],
                "posts": [
                    ("Как ухаживать за изделиями из шерсти", "Советы по стирке и хранению вязаных вещей."),
                ],
            },
        ]

        now = datetime.now(timezone.utc)
        for data in sellers_data:
            user = User(
                email=data["email"],
                password_hash=hash_password("password123"),
                role=UserRole.seller,
                display_name=data["name"],
            )
            session.add(user)
            await session.flush()

            cover = next(img, None)
            avatar = next(img, None)
            seller = SellerProfile(
                user_id=user.id,
                name=data["name"],
                description=data["description"],
                location=data["location"],
                avatar=avatar,
                cover_image=cover,
            )
            session.add(seller)
            await session.flush()

            for title, desc, price, stock, tags in data["products"]:
                product = Product(
                    seller_id=seller.id,
                    title=title,
                    description=desc,
                    price=price,
                    stock=stock,
                    images=[x for x in [next(img, None)] if x],
                )
                product.tags = [await get_or_create_tag(t, session) for t in tags]
                session.add(product)

            for title, desc, price, duration, tags in data["services"]:
                service = Service(
                    seller_id=seller.id,
                    title=title,
                    description=desc,
                    price=price,
                    duration=duration,
                    images=[x for x in [next(img, None)] if x],
                )
                service.tags = [await get_or_create_tag(t, session) for t in tags]
                session.add(service)
                await session.flush()

                for week in range(1, 4):
                    start = now + timedelta(days=7 * week, hours=11)
                    end = start + timedelta(minutes=duration)
                    session.add(
                        Schedule(
                            service_id=service.id,
                            start_time=start,
                            end_time=end,
                            seats=8,
                            location="Студия" if week % 2 else "Онлайн (Zoom)",
                        )
                    )

            for title, content in data["posts"]:
                session.add(BlogPost(seller_id=seller.id, title=title, content=content))

        await session.flush()
        demo_products = (await session.scalars(select(Product).limit(3))).all()
        demo_services = (await session.scalars(select(Service).limit(2))).all()
        seller_users = (await session.scalars(select(User).where(User.role == UserRole.seller).limit(1))).all()

        if demo_products:
            r1 = Review(
                author_id=buyer.id,
                product_id=demo_products[0].id,
                rating=5,
                text="Отличное качество, очень довольна покупкой!",
            )
            session.add(r1)
            await session.flush()
            if seller_users:
                session.add(ReviewVote(review_id=r1.id, user_id=seller_users[0].id, value=1))
        if len(demo_products) > 1:
            session.add(
                Review(
                    author_id=buyer.id,
                    product_id=demo_products[1].id,
                    rating=4,
                    text="Красиво сделано, доставка быстрая.",
                )
            )
        if demo_services:
            r3 = Review(
                author_id=buyer.id,
                service_id=demo_services[0].id,
                rating=5,
                text="Увлекательный мастер-класс, всё понятно объяснили.",
            )
            session.add(r3)
            await session.flush()
            if seller_users:
                session.add(ReviewVote(review_id=r3.id, user_id=seller_users[0].id, value=1))

        await session.commit()


async def main() -> None:
    await create_schema()
    await seed_demo_data()


if __name__ == "__main__":
    asyncio.run(main())
