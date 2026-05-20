# CraftSphere — Маркетплейс мастеров

Платформа для продажи handmade-товаров и мастер-классов.

- Backend: FastAPI + async SQLAlchemy + PostgreSQL
- Frontend: React + TypeScript + Zustand + React Router

## Функциональность
- Регистрация и авторизация
- Профиль продавца с витриной
- Каталог товаров и мастер-классов
- Расписание и запись на мастер-классы
- Корзина и оформление заказов
- Поиск по платформе
- Отзывы и рейтинги

## Требования
- Python 3.11+
- Node.js 18+
- Docker Desktop

## Запуск

### 1. Клонировать репозиторий
```bash
git clone https://github.com/SophiaShipenkova/CraftSphere.git
cd CraftSphere
```

### 2. Запустить базу данных
```bash
docker compose up -d
```

### 3. Запустить backend

Открой первый терминал и выполни:

**Windows:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m app.db.init_db
uvicorn app.main:app --reload
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.db.init_db
uvicorn app.main:app --reload
```

Оставь это окно открытым.

### 4. Запустить frontend

Открой **второй** терминал и выполни:

```bash
cd CraftSphere/frontend
npm install
npm run dev
```

Оставь это окно открытым.

## Адреса
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Документация API: http://localhost:8000/docs
