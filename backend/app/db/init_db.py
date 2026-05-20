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

        any_product_with_image = await session.scalar(
            select(Product.id).where(Product.images != []).limit(1)
        )
        if any_product_with_image:
            return

        images = await fetch_images(24)
        img = iter(images + [None] * 50)

        buyer = User(
            email="buyer@example.com",
            display_name="РђРЅРЅР° РџРѕРєСѓРїР°С‚РµР»СЊ",
            password_hash=hash_password("password123"),
            role=UserRole.buyer,
        )
        session.add(buyer)
        await session.flush()

        sellers_data = [
            {
                "email": "leaves@example.com",
                "name": "Leaves Studio",
                "location": "РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі",
                "description": "РЎС‚СѓРґРёСЏ handmade-СѓРєСЂР°С€РµРЅРёР№ Рё РґРµРєРѕСЂР° РёР· РЅР°С‚СѓСЂР°Р»СЊРЅС‹С… РјР°С‚РµСЂРёР°Р»РѕРІ. РњС‹ СЃРѕС‡РµС‚Р°РµРј РєР°РјРЅРё, РјРµС‚Р°Р»Р» Рё Р¶РёРІС‹Рµ С‚РµРєСЃС‚СѓСЂС‹ вЂ” РєР°Р¶РґРѕРµ РёР·РґРµР»РёРµ СѓРЅРёРєР°Р»СЊРЅРѕ.",
                "products": [
                    (
                        "РЎРµСЂСЊРіРё РёР· Р·РµР»С‘РЅРѕРіРѕ Р°РІР°РЅС‚СЋСЂРёРЅР° Рё СЏС€РјС‹",
                        "РЎРµСЂСЊРіРё СЂСѓС‡РЅРѕР№ СЂР°Р±РѕС‚С‹ РёР· Р°РІР°РЅС‚СЋСЂРёРЅР°, СЏС€РјС‹ Рё РјРµРґРё. Р›С‘РіРєРёРµ, СЃ РЅР°С‚СѓСЂР°Р»СЊРЅС‹Рј Р±Р»РµСЃРєРѕРј РєР°РјРЅСЏ.",
                        2000,
                        7,
                        ["СѓРєСЂР°С€РµРЅРёСЏ", "РєР°РјРЅРё"],
                    ),
                    (
                        "Р‘СЂР°СЃР»РµС‚ РёР· СЏС€РјС‹ Рё РѕРЅРёРєСЃР°",
                        "Р‘СЂР°СЃР»РµС‚ РЅР° СЂРµР·РёРЅРєРµ СЃ РїРѕРґР±РѕСЂРєРѕР№ РєР°РјРЅРµР№ РІ Р·РµР»С‘РЅРѕ-С‡С‘СЂРЅРѕР№ РіР°РјРјРµ.",
                        2400,
                        5,
                        ["СѓРєСЂР°С€РµРЅРёСЏ", "РєР°РјРЅРё"],
                    ),
                    (
                        "РљСѓР»РѕРЅ В«Р›РёСЃС‚В» РёР· РјРµРґРё",
                        "РџР°С‚РёРЅРёСЂРѕРІР°РЅРЅС‹Р№ РєСѓР»РѕРЅ РІ С„РѕСЂРјРµ Р»РёСЃС‚Р° РЅР° С€РЅСѓСЂРµ РёР· РІРѕС‰С‘РЅРѕРіРѕ С…Р»РѕРїРєР°.",
                        1800,
                        10,
                        ["СѓРєСЂР°С€РµРЅРёСЏ"],
                    ),
                ],
                "services": [
                    (
                        "РњР°СЃС‚РµСЂ-РєР»Р°СЃСЃ: СЃРµСЂСЊРіРё РёР· РЅР°С‚СѓСЂР°Р»СЊРЅС‹С… РєР°РјРЅРµР№",
                        "Р—Р° 2 С‡Р°СЃР° СЃРѕР·РґР°РґРёС‚Рµ РїР°СЂСѓ СЃРµСЂС‘Рі РёР· РєР°РјРЅРµР№ Рё С„СѓСЂРЅРёС‚СѓСЂС‹. Р’СЃРµ РјР°С‚РµСЂРёР°Р»С‹ РІРєР»СЋС‡РµРЅС‹.",
                        4000,
                        120,
                        ["СѓРєСЂР°С€РµРЅРёСЏ", "РґР»СЏ РЅР°С‡РёРЅР°СЋС‰РёС…"],
                    ),
                    (
                        "Р’РµС‡РµСЂРЅРёР№ РњРљ: СЃР±РѕСЂРєР° Р±СЂР°СЃР»РµС‚Р°",
                        "РџРѕРґР±РѕСЂ РєР°РјРЅРµР№, СЃР±РѕСЂРєР° Рё С„РёРЅРёС€РЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР°. Р“СЂСѓРїРїР° РґРѕ 8 С‡РµР»РѕРІРµРє.",
                        3500,
                        90,
                        ["СѓРєСЂР°С€РµРЅРёСЏ", "РїСЂР°РєС‚РёРєР°"],
                    ),
                ],
                "posts": [
                    ("РљР°Рє РјС‹ РІС‹Р±РёСЂР°РµРј РєР°РјРЅРё РґР»СЏ РєРѕР»Р»РµРєС†РёРё", "РљР°Р¶РґС‹Р№ РєР°РјРµРЅСЊ РїСЂРѕС…РѕРґРёС‚ РѕС‚Р±РѕСЂ РїРѕ РѕС‚С‚РµРЅРєСѓ Рё С„Р°РєС‚СѓСЂРµ. РњС‹ СЂР°Р±РѕС‚Р°РµРј СЃ РїРѕСЃС‚Р°РІС‰РёРєР°РјРё РёР· РЈСЂР°Р»Р° Рё РљР°СЂРµР»РёРё."),
                    ("Р—Р°РєСѓР»РёСЃСЊРµ Leaves Studio", "РџРѕРєР°Р·С‹РІР°РµРј СЂР°Р±РѕС‡РёР№ СЃС‚РѕР», РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹ Рё РїСЂРѕС†РµСЃСЃ СЃР±РѕСЂРєРё СЃРµСЂС‘Рі РїРµСЂРµРґ РѕС‚РїСЂР°РІРєРѕР№ РєР»РёРµРЅС‚Сѓ."),
                ],
            },
            {
                "email": "claydream@example.com",
                "name": "ClayDream Studio",
                "location": "РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі",
                "description": "Р“РѕРЅС‡Р°СЂРЅР°СЏ РјР°СЃС‚РµСЂСЃРєР°СЏ: РєРµСЂР°РјРёРєР° РґР»СЏ РґРѕРјР° Рё Р°РІС‚РѕСЂСЃРєРёРµ РјР°СЃС‚РµСЂ-РєР»Р°СЃСЃС‹ РґР»СЏ РЅР°С‡РёРЅР°СЋС‰РёС….",
                "products": [
                    (
                        "РљРµСЂР°РјРёС‡РµСЃРєР°СЏ РєСЂСѓР¶РєР° В«Р›РµСЃВ»",
                        "РљСЂСѓР¶РєР° СЃ СЂСѓС‡РєРѕР№-РІРµС‚РєРѕР№ Рё СЂРѕСЃРїРёСЃСЊСЋ РґРµСЂРµРІСЊРµРІ. РћР±СЉС‘Рј 350 РјР», РїРёС‰РµРІР°СЏ РіР»Р°Р·СѓСЂСЊ.",
                        1800,
                        6,
                        ["РєРµСЂР°РјРёРєР°", "РґРѕРј"],
                    ),
                    (
                        "РўР°СЂРµР»РєР° СЂСѓС‡РЅРѕР№ Р»РµРїРєРё",
                        "Р”РµРєРѕСЂР°С‚РёРІРЅР°СЏ С‚Р°СЂРµР»РєР° 24 СЃРј, РїРѕРґС…РѕРґРёС‚ РґР»СЏ СЃРµСЂРІРёСЂРѕРІРєРё.",
                        2100,
                        4,
                        ["РєРµСЂР°РјРёРєР°"],
                    ),
                    (
                        "РќР°Р±РѕСЂ С‡Р°Р№РЅС‹С… С‡Р°С€РµРє",
                        "Р”РІРµ С‡Р°С€РєРё РІ РїР°СЂРµ, РјР°С‚РѕРІР°СЏ РіР»Р°Р·СѓСЂСЊ, С‚С‘РїР»С‹Р№ Р±РµР¶РµРІС‹Р№ С‚РѕРЅ.",
                        3500,
                        3,
                        ["РєРµСЂР°РјРёРєР°", "РїРѕРґР°СЂРѕРє"],
                    ),
                ],
                "services": [
                    (
                        "РњР°СЃС‚РµСЂ-РєР»Р°СЃСЃ: РєРµСЂР°РјРёС‡РµСЃРєР°СЏ РєСЂСѓР¶РєР° РІСЂСѓС‡РЅСѓСЋ",
                        "РЎРѕР·РґР°РЅРёРµ Рё СЂРѕСЃРїРёСЃСЊ РєСЂСѓР¶РєРё РїРѕРґ СЂСѓРєРѕРІРѕРґСЃС‚РІРѕРј РјР°СЃС‚РµСЂР°. РћР±Р¶РёРі РІРєР»СЋС‡С‘РЅ.",
                        4000,
                        150,
                        ["РєРµСЂР°РјРёРєР°", "РґР»СЏ РЅР°С‡РёРЅР°СЋС‰РёС…"],
                    ),
                    (
                        "РћСЃРЅРѕРІС‹ РіРѕРЅС‡Р°СЂРЅРѕРіРѕ РєСЂСѓРіР°",
                        "Р—РЅР°РєРѕРјСЃС‚РІРѕ СЃ РєСЂСѓРіРѕРј, С†РµРЅС‚СЂРѕРІРєР° Рё РїРµСЂРІС‹Рµ С„РѕСЂРјС‹.",
                        2900,
                        120,
                        ["РєРµСЂР°РјРёРєР°", "РґР»СЏ РЅР°С‡РёРЅР°СЋС‰РёС…"],
                    ),
                ],
                "posts": [
                    ("РџРѕС‡РµРјСѓ РєРµСЂР°РјРёРєР° СѓСЃРїРѕРєР°РёРІР°РµС‚", "Р Р°Р±РѕС‚Р° СЃ РіР»РёРЅРѕР№ СЃРЅРёР¶Р°РµС‚ СЃС‚СЂРµСЃСЃ вЂ” СЂР°СЃСЃРєР°Р·С‹РІР°РµРј, С‡С‚Рѕ РїСЂРѕРёСЃС…РѕРґРёС‚ РЅР° РњРљ."),
                ],
            },
            {
                "email": "knitsoul@example.com",
                "name": "KnitSoul",
                "location": "РњРѕСЃРєРІР°",
                "description": "РўС‘РїР»С‹Рµ РІРµС‰Рё СЂСѓС‡РЅРѕР№ СЂР°Р±РѕС‚С‹ Рё СѓСЋС‚РЅС‹Рµ РјР°СЃС‚РµСЂ-РєР»Р°СЃСЃС‹ РїРѕ РІСЏР·Р°РЅРёСЋ.",
                "products": [
                    (
                        "Р’СЏР·Р°РЅС‹Р№ С€Р°СЂС„ РёР· РјРµСЂРёРЅРѕСЃР°",
                        "РњСЏРіРєРёР№ С€Р°СЂС„ 180Г—30 СЃРј, СЂСѓС‡РЅР°СЏ РІСЏР·РєР° СЃРїРёС†Р°РјРё.",
                        1600,
                        8,
                        ["РІСЏР·Р°РЅРёРµ", "РѕРґРµР¶РґР°"],
                    ),
                    (
                        "РЁРµСЂСЃС‚СЏРЅРѕР№ РїР»РµРґ",
                        "РџР»РµРґ 120Г—150 СЃРј, СЃРјРµС€Р°РЅРЅР°СЏ С€РµСЂСЃС‚СЊ, РЅР°С‚СѓСЂР°Р»СЊРЅС‹Рµ РѕС‚С‚РµРЅРєРё.",
                        4200,
                        2,
                        ["РІСЏР·Р°РЅРёРµ", "РґРѕРј"],
                    ),
                ],
                "services": [
                    (
                        "Р’СЏР·Р°РЅРёРµ СЃРїРёС†Р°РјРё РґР»СЏ РЅРѕРІРёС‡РєРѕРІ",
                        "РќР°СѓС‡РёРјСЃСЏ РЅР°Р±РёСЂР°С‚СЊ РїРµС‚Р»Рё Рё СЃРІСЏР·Р°С‚СЊ РїРµСЂРІС‹Р№ РѕР±СЂР°Р·РµС† Р·Р° РѕРґРЅРѕ Р·Р°РЅСЏС‚РёРµ.",
                        1900,
                        120,
                        ["РІСЏР·Р°РЅРёРµ", "РґР»СЏ РЅР°С‡РёРЅР°СЋС‰РёС…"],
                    ),
                ],
                "posts": [
                    ("РљР°Рє СѓС…Р°Р¶РёРІР°С‚СЊ Р·Р° РёР·РґРµР»РёСЏРјРё РёР· С€РµСЂСЃС‚Рё", "РЎРѕРІРµС‚С‹ РїРѕ СЃС‚РёСЂРєРµ Рё С…СЂР°РЅРµРЅРёСЋ РІСЏР·Р°РЅС‹С… РІРµС‰РµР№."),
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
                            location="РЎС‚СѓРґРёСЏ" if week % 2 else "РћРЅР»Р°Р№РЅ (Zoom)",
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
                text="РћС‚Р»РёС‡РЅРѕРµ РєР°С‡РµСЃС‚РІРѕ, РѕС‡РµРЅСЊ РґРѕРІРѕР»СЊРЅР° РїРѕРєСѓРїРєРѕР№!",
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
                    text="РљСЂР°СЃРёРІРѕ СЃРґРµР»Р°РЅРѕ, РґРѕСЃС‚Р°РІРєР° Р±С‹СЃС‚СЂР°СЏ.",
                )
            )
        if demo_services:
            r3 = Review(
                author_id=buyer.id,
                service_id=demo_services[0].id,
                rating=5,
                text="РЈРІР»РµРєР°С‚РµР»СЊРЅС‹Р№ РјР°СЃС‚РµСЂ-РєР»Р°СЃСЃ, РІСЃС‘ РїРѕРЅСЏС‚РЅРѕ РѕР±СЉСЏСЃРЅРёР»Рё.",
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

