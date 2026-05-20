from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import auth, cart_orders, catalog, home, media, products, reviews, schedules, search, sellers, services, users
from app.core.paths import resolve_upload_dir
from app.db.init_db import create_schema, seed_demo_data
from app.db.session import engine

UPLOADS_PATH = resolve_upload_dir()

app = FastAPI(title="Masters Marketplace")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://93.183.71.133:18501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sellers.router)
app.include_router(products.router)
app.include_router(services.router)
app.include_router(search.router)
app.include_router(home.router)
app.include_router(media.router)
app.include_router(users.router)
app.include_router(cart_orders.router)
app.include_router(catalog.router)
app.include_router(schedules.router)
app.include_router(reviews.product_router)
app.include_router(reviews.service_router)
app.include_router(reviews.router)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_PATH)), name="uploads")


@app.on_event("startup")
async def startup_migrations():
    await create_schema()
    await seed_demo_data()
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE services ADD COLUMN IF NOT EXISTS images VARCHAR[] DEFAULT ARRAY[]::VARCHAR[]")
        )
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 10"))
        await conn.execute(text("ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS cover_image VARCHAR(512)"))
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS review_votes (
                    id SERIAL PRIMARY KEY,
                    review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    value INTEGER NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT now(),
                    CONSTRAINT uq_review_vote_user UNIQUE (review_id, user_id)
                )
                """
            )
        )


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}
