#!/usr/bin/env node
// Генератор PDF-презентации к предзащите ВКР — CraftSphere

const fs = require('fs')
const path = require('path')
const { jsPDF } = require(path.resolve(__dirname, '../learning/node_modules/jspdf'))

const FONT_REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

const W = 254
const H = 142.9
const MARGIN = 10
const CW = W - 2 * MARGIN

const C = {
  bg: [244, 247, 251],
  darkBg: [15, 23, 42],
  accent: [124, 58, 237],
  accent2: [37, 99, 235],
  green: [34, 197, 94],
  red: [239, 68, 68],
  orange: [249, 115, 22],
  text: [23, 32, 51],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  panel: [255, 255, 255],
  lightBg: [241, 245, 249],
  border: [226, 232, 240],
}

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] })

const regBuf = fs.readFileSync(FONT_REG).toString('latin1')
const boldBuf = fs.readFileSync(FONT_BOLD).toString('latin1')
doc.addFileToVFS('DejaVuSans.ttf', regBuf)
doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal')
doc.addFileToVFS('DejaVuSans-Bold.ttf', boldBuf)
doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold')

let slideCount = 0

function setColor(c) { doc.setTextColor(c[0], c[1], c[2]) }
function setFill(c) { doc.setFillColor(c[0], c[1], c[2]) }
function setDraw(c) { doc.setDrawColor(c[0], c[1], c[2]) }

function bg(color = C.bg) {
  setFill(color)
  doc.rect(0, 0, W, H, 'F')
}

function newSlide(bgColor = C.bg, showNumber = true) {
  if (slideCount > 0) doc.addPage([W, H], 'landscape')
  slideCount += 1
  bg(bgColor)
  if (showNumber) {
    doc.setFont('DejaVu', 'normal')
    doc.setFontSize(7)
    setColor(C.muted)
    doc.text(String(slideCount), W - 8, H - 4)
  }
}

function title(text, subtitleText) {
  doc.setFont('DejaVu', 'bold')
  doc.setFontSize(18)
  setColor(C.text)
  doc.text(text, MARGIN, 14)
  if (subtitleText) {
    doc.setFont('DejaVu', 'normal')
    doc.setFontSize(9.5)
    setColor(C.muted)
    doc.text(subtitleText, MARGIN, 21)
  }
}

function roundedRect(x, y, w, h, r = 3, fillColor = C.panel, borderColor = C.border) {
  setFill(fillColor)
  setDraw(borderColor)
  doc.roundedRect(x, y, w, h, r, r, 'FD')
}

function writeLines(text, x, y, maxW, size = 9, color = C.text, bold = false, lineH = size * 0.45 + 1.2) {
  doc.setFont('DejaVu', bold ? 'bold' : 'normal')
  doc.setFontSize(size)
  setColor(color)
  const lines = Array.isArray(text) ? text : doc.splitTextToSize(text, maxW)
  doc.text(lines, x, y)
  return y + Math.max(1, lines.length) * lineH
}

function bulletList(items, x, y, maxW, color = C.accent, size = 8.8, gap = 2.2) {
  let cy = y
  for (const item of items) {
    setFill(color)
    doc.circle(x + 1.8, cy - 1.1, 1.1, 'F')
    const lines = doc.splitTextToSize(item, maxW - 8)
    doc.setFont('DejaVu', 'normal')
    doc.setFontSize(size)
    setColor(C.text)
    doc.text(lines, x + 6, cy)
    cy += lines.length * (size * 0.42 + 1.1) + gap
  }
  return cy
}

function statCard(x, y, w, h, titleText, bodyText, accent = C.accent) {
  roundedRect(x, y, w, h, 3.5, C.panel, C.border)
  setFill(accent)
  doc.rect(x, y, 4, h, 'F')
  writeLines(titleText, x + 8, y + 10, w - 12, 9.5, C.text, true)
  writeLines(bodyText, x + 8, y + 18, w - 12, 8.1, C.muted)
}

function taskCard(x, y, w, h, num, text) {
  roundedRect(x, y, w, h, 3, C.panel, C.border)
  setFill(C.accent)
  doc.circle(x + 8, y + 8.5, 4.8, 'F')
  doc.setFont('DejaVu', 'bold')
  doc.setFontSize(10)
  setColor(C.white)
  doc.text(String(num), x + 8, y + 10, { align: 'center' })
  writeLines(text, x + 16, y + 8, w - 20, 7.8, C.text)
}

function headerCard(x, y, w, h, label, items, accent) {
  roundedRect(x, y, w, h, 4, C.panel, C.border)
  setFill(accent)
  doc.roundedRect(x, y, w, 8, 4, 4, 'F')
  doc.rect(x, y + 4, w, 4, 'F')
  doc.setFont('DejaVu', 'bold')
  doc.setFontSize(10)
  setColor(C.white)
  doc.text(label, x + 6, y + 5.3)
  bulletList(items, x + 3, y + 16, w - 8, accent, 7.8, 1.8)
}

function tableCell(x, y, w, h, text, opts = {}) {
  const fill = opts.fill || C.panel
  const textColor = opts.textColor || C.text
  const bold = Boolean(opts.bold)
  const align = opts.align || 'left'
  setFill(fill)
  setDraw(C.border)
  doc.rect(x, y, w, h, 'FD')
  doc.setFont('DejaVu', bold ? 'bold' : 'normal')
  doc.setFontSize(7.7)
  setColor(textColor)
  const lines = doc.splitTextToSize(String(text), w - 4)
  const tx = align === 'center' ? x + w / 2 : x + 2
  doc.text(lines, tx, y + 4.8, { align })
}

function imageData(filePath) {
  const ext = path.extname(filePath).slice(1).toUpperCase() || 'PNG'
  const mime = ext === 'JPG' ? 'jpeg' : ext.toLowerCase()
  return {
    data: `data:image/${mime};base64,${fs.readFileSync(filePath).toString('base64')}`,
    format: ext === 'JPG' ? 'JPEG' : ext,
  }
}

function imagePanel(filePath, x, y, w, h, caption) {
  roundedRect(x, y, w, h, 3.5, C.panel, C.border)
  const img = imageData(filePath)
  const props = doc.getImageProperties(img.data)
  const innerX = x + 3
  const innerY = y + 3
  const innerW = w - 6
  const innerH = h - 12
  const scale = Math.min(innerW / props.width, innerH / props.height)
  const drawW = props.width * scale
  const drawH = props.height * scale
  const drawX = innerX + (innerW - drawW) / 2
  const drawY = innerY + (innerH - drawH) / 2
  doc.addImage(img.data, img.format, drawX, drawY, drawW, drawH)
  writeLines(caption, x + 4, y + h - 4.2, w - 8, 7.5, C.muted, false)
}

const assetsDir = path.resolve(__dirname, 'assets')
const screenshots = {
  home: path.join(assetsDir, 'site-home.png'),
  product: path.join(assetsDir, 'site-product.png'),
  service: path.join(assetsDir, 'site-service.png'),
  seller: path.join(assetsDir, 'site-seller.png'),
}

// 1. Актуальность
newSlide()
title('Актуальность темы', 'Почему мастерам нужен единый цифровой контур')
const actualItems = [
  'Мастера ручной работы часто ведут продажи, расписание мастер-классов и коммуникацию с клиентами в разных сервисах.',
  'Раздельные каналы усложняют поддержку актуального ассортимента, расписания занятий и портфолио.',
  'Покупателю удобнее получать информацию о мастере, товарах и мастер-классах в одном интерфейсе.',
  'Единая платформа сокращает количество ручных операций и упрощает взаимодействие между мастером и клиентом.',
]
bulletList(actualItems, MARGIN, 32, 128, C.accent2, 8.8, 2.3)
statCard(146, 30, 46, 28, 'Единый профиль', 'товары, портфолио и контакты в одном месте', C.accent)
statCard(198, 30, 46, 28, 'Товары + МК', 'каталог изделий и запись на занятия', C.accent2)
statCard(146, 64, 46, 28, 'Быстрое обновление', 'единое управление описанием, фото и расписанием', C.green)
statCard(198, 64, 46, 28, 'Меньше ручных действий', 'не нужно дублировать данные в нескольких каналах', C.orange)
roundedRect(MARGIN, 103, CW, 23, 4, C.lightBg, C.border)
writeLines('Практическая актуальность работы состоит в проектировании платформы, которая объединяет витрину товаров, страницу мастера, поиск и организацию мастер-классов в едином веб-приложении.', MARGIN + 6, 112, CW - 12, 8.8)

// 2. Методологический аппарат
newSlide()
title('Методологический аппарат')
roundedRect(MARGIN, 30, 108, 35, 4, C.panel, C.border)
writeLines('Объект исследования', MARGIN + 6, 39, 96, 10, C.text, true)
writeLines('Процесс организации продажи товаров ручной работы и проведения мастер-классов с использованием веб-технологий.', MARGIN + 6, 47, 96, 8.5)
roundedRect(MARGIN, 72, 108, 35, 4, C.panel, C.border)
writeLines('Предмет исследования', MARGIN + 6, 81, 96, 10, C.text, true)
writeLines('Проектирование и разработка многофункциональной веб-платформы, объединяющей маркетплейс handmade-товаров и систему организации мастер-классов.', MARGIN + 6, 89, 96, 8.5)
roundedRect(126, 30, 118, 77, 4, C.panel, C.border)
writeLines('Методы исследования', 132, 40, 106, 10, C.text, true)
bulletList([
  'анализ предметной области и целевой аудитории',
  'сравнительный анализ существующих решений',
  'объектно-ориентированное проектирование',
  'прототипирование интерфейсов',
  'функциональное тестирование и проверка API',
], 130, 50, 108, C.accent2, 8.4, 2)

// 3. Цель и задачи
newSlide()
title('Цель и задачи работы', 'Что делаем, зачем и что должно получиться')
roundedRect(MARGIN, 28, CW, 20, 4, C.lightBg, C.border)
setFill(C.accent)
doc.rect(MARGIN, 28, 4, 20, 'F')
writeLines('Цель:', MARGIN + 8, 36, 18, 11, C.text, true)
writeLines('спроектировать и разработать веб-платформу CraftSphere, объединяющую маркетплейс товаров ручной работы и систему организации мастер-классов.', MARGIN + 26, 36, CW - 32, 8.7)
const tasks = [
  'Провести анализ предметной области и существующих решений.',
  'Сформировать функциональные и нефункциональные требования.',
  'Разработать архитектуру системы и модель данных.',
  'Реализовать серверную часть: REST API, авторизацию и БД.',
  'Реализовать клиентскую часть: SPA, каталог, поиск и кабинеты.',
  'Провести тестирование и подготовить демонстрационные данные.',
]
const taskW = 112
const taskH = 18
for (let i = 0; i < tasks.length; i++) {
  const col = i % 2
  const row = Math.floor(i / 2)
  taskCard(MARGIN + col * (taskW + 8), 55 + row * 21, taskW, taskH, i + 1, tasks[i])
}
roundedRect(MARGIN, 122, CW, 10, 3, C.panel, C.border)
writeLines('Ожидаемый результат: работающий MVP платформы с регистрацией, каталогом, карточками товаров и услуг, поиском и личными кабинетами продавца и покупателя.', MARGIN + 4, 128, CW - 8, 7.8)

// 4. Анализ предметной области
newSlide()
title('Анализ предметной области', 'Характеристика деятельности мастеров ручной работы')
const domainCards = [
  ['Мастера-индивидуалы', 'Работают самостоятельно и совмещают производство, упаковку, продвижение и коммуникацию с клиентами.'],
  ['Небольшие студии', 'Организуют занятия и продают изделия, но нуждаются в понятном инструменте для расписания и витрины.'],
  ['Потребности мастеров', 'Единое место для профиля, каталога товаров, расписания мастер-классов, портфолио и публикаций.'],
  ['Потребности покупателей', 'Быстрый поиск, понятная карточка мастера и возможность купить изделие или записаться на занятие.'],
]
domainCards.forEach(([name, text], i) => {
  const col = i % 2
  const row = Math.floor(i / 2)
  const x = MARGIN + col * 117
  const y = 30 + row * 34
  statCard(x, y, 112, 28, name, text, i % 2 === 0 ? C.accent : C.accent2)
})
roundedRect(MARGIN, 102, CW, 22, 4, C.accent, C.accent)
writeLines('Ключевой вывод: мастерам нужна не только витрина товаров, а единая экосистема, где связаны каталог, профиль, расписание мастер-классов и презентация работ.', MARGIN + 6, 112, CW - 12, 8.7, C.white)

// 5. Аналоги
newSlide()
title('Обзор существующих решений', 'Сравнительный анализ аналогов')
const tx = [54, 36, 36, 28, 62]
const headers = ['Критерий', 'Ярмарка\nМастеров', 'Яндекс\nАфиша', 'Etsy', 'CraftSphere']
let x = MARGIN
headers.forEach((cell, i) => {
  tableCell(x, 28, tx[i], 11, cell, { fill: C.accent, textColor: C.white, bold: true, align: i === 0 ? 'left' : 'center' })
  x += tx[i]
})
const rows = [
  ['Продажа товаров', 'Да', 'Нет', 'Да', 'Да'],
  ['Мастер-классы', 'Частично', 'Да', 'Нет', 'Да'],
  ['Профиль мастера', 'Да', 'Нет', 'Да', 'Да'],
  ['Портфолио', 'Частично', 'Нет', 'Частично', 'Да'],
  ['Блог / истории', 'Нет', 'Нет', 'Нет', 'Да'],
  ['Поиск по тегам', 'Да', 'Частично', 'Да', 'Да'],
  ['Расписание МК', 'Нет', 'Да', 'Нет', 'Да'],
  ['Единая экосистема', 'Нет', 'Нет', 'Нет', 'Да'],
]
let y = 39
rows.forEach((row, rowIdx) => {
  let cx = MARGIN
  row.forEach((cell, i) => {
    tableCell(cx, y, tx[i], 9, cell, { fill: rowIdx % 2 === 0 ? C.panel : C.lightBg, align: i === 0 ? 'left' : 'center' })
    cx += tx[i]
  })
  y += 9
})
roundedRect(MARGIN, 116, CW, 12, 3, C.lightBg, C.border)
writeLines('Вывод: существующие платформы закрывают отдельные сценарии, но не объединяют продажу изделий, мастер-классы, профиль мастера, портфолио и публикации в одном интерфейсе.', MARGIN + 4, 123, CW - 8, 7.8)

// 6. Требования
newSlide()
title('Анализ требований к платформе', 'Функциональные, нефункциональные, UX/UI')
headerCard(MARGIN, 29, 74, 96, 'Функциональные', [
  'регистрация и авторизация через JWT',
  'CRUD товаров и мастер-классов',
  'расписание мастер-классов',
  'поиск по товарам, услугам, мастерам и тегам',
  'личные кабинеты продавца и покупателя',
  'загрузка изображений',
], C.accent)
headerCard(90, 29, 74, 96, 'Нефункциональные', [
  'асинхронная архитектура backend',
  'REST API и OpenAPI-документация',
  'PostgreSQL + async SQLAlchemy',
  'ролевой доступ и безопасность токенов',
  'масштабируемость компонентной структуры',
], C.accent2)
headerCard(170, 29, 74, 96, 'UX/UI', [
  'SPA с client-side routing',
  'адаптивная вёрстка',
  'интуитивная навигация',
  'live-поиск в шапке сайта',
  'единый визуальный стиль',
], C.green)

// 7. Архитектура
newSlide()
title('Архитектурное проектирование', 'Трёхзвенная клиент-серверная архитектура')
const archBoxes = [
  { x: 10, title: 'Frontend (SPA)', text: 'React\nTypeScript\nReact Router\nZustand\nThree.js', color: C.accent2 },
  { x: 92, title: 'Backend (API)', text: 'FastAPI\nPydantic\nSQLAlchemy 2\nJWT\nAsync', color: C.accent },
  { x: 174, title: 'Database', text: 'PostgreSQL 16\nasyncpg\n9 сущностей\nM:N через теги', color: C.green },
]
archBoxes.forEach(box => {
  roundedRect(box.x, 32, 70, 48, 4, C.panel, C.border)
  setFill(box.color)
  doc.roundedRect(box.x, 32, 70, 8, 4, 4, 'F')
  doc.rect(box.x, 36, 70, 4, 'F')
  writeLines(box.title, box.x + 35, 37.2, 60, 10.5, C.white, true)
  doc.text(box.title, box.x + 35, 37.2, { align: 'center' })
  writeLines(box.text.split('\n'), box.x + 8, 49, 54, 10, C.text)
})
setDraw(C.muted)
doc.setLineWidth(0.6)
doc.line(80, 56, 92, 56)
doc.line(162, 56, 174, 56)
writeLines('REST API', 82, 52, 18, 7, C.muted)
writeLines('asyncpg', 164, 52, 18, 7, C.muted)
statCard(10, 90, 55, 24, '25+ API-эндпоинтов', 'маршруты auth, products, services, search, home, media, users', C.accent)
statCard(69, 90, 55, 24, '9 сущностей БД', 'users, profiles, products, services, schedule, tags, blog, portfolio, reviews', C.accent2)
statCard(128, 90, 55, 24, 'JWT-авторизация', 'разделение ролей seller / buyer и защищённые запросы', C.green)
statCard(187, 90, 57, 24, 'Docker Compose', 'развёртывание frontend, backend и PostgreSQL на VPS', C.orange)

// 8. Модель данных
newSlide()
title('Модель данных', 'Схема базы данных — 9 сущностей')
const entities = [
  ['User', 'id, email, password, role, display_name', C.accent],
  ['SellerProfile', 'id, user_id, name, description, avatar, location', C.accent],
  ['Product', 'id, seller_id, title, description, price, images', C.accent2],
  ['Service', 'id, seller_id, title, description, price, duration', C.accent2],
  ['Schedule', 'id, service_id, start_time, end_time, seats, location', C.green],
  ['Tag', 'id, name; M:N связи с товарами, услугами и портфолио', C.orange],
  ['BlogPost', 'id, seller_id, title, content', C.accent],
  ['PortfolioItem', 'id, seller_id, title, description, images', C.accent2],
  ['Review', 'id, author_id, product_id/service_id, rating, text', C.red],
]
entities.forEach(([name, fields, color], i) => {
  const col = i % 3
  const row = Math.floor(i / 3)
  const x0 = MARGIN + col * 78
  const y0 = 28 + row * 29
  roundedRect(x0, y0, 74, 24, 3, C.panel, C.border)
  setFill(color)
  doc.rect(x0, y0, 74, 6, 'F')
  doc.setFont('DejaVu', 'bold')
  doc.setFontSize(9.4)
  setColor(C.white)
  doc.text(name, x0 + 4, y0 + 4.3)
  writeLines(fields, x0 + 4, y0 + 11.5, 66, 8.1, C.text)
})
roundedRect(MARGIN, 118, CW, 11, 3, C.lightBg, C.border)
writeLines('Связи: User 1:1 SellerProfile; SellerProfile 1:N Products, Services, BlogPosts и PortfolioItem; Service 1:N Schedule; Tag M:N Products/Services/Portfolio; Review связан с User и Product или Service.', MARGIN + 4, 124.5, CW - 8, 7.5)

// 9. Пользовательские сценарии
newSlide()
title('Пользовательские сценарии', 'Use-case диаграмма (текстовая)')
headerCard(MARGIN, 30, 74, 95, 'Покупатель', [
  'просматривает каталог товаров и мастер-классов',
  'использует поиск по тегам и мастерам',
  'записывается на мастер-класс',
  'добавляет товары в корзину',
  'переходит в профиль мастера',
], C.accent2)
headerCard(90, 30, 74, 95, 'Продавец', [
  'регистрируется с ролью seller',
  'создаёт и редактирует товары',
  'добавляет мастер-классы и расписание',
  'управляет профилем и витриной',
  'публикует блог-посты',
], C.accent)
headerCard(170, 30, 74, 95, 'Система', [
  'обеспечивает JWT-авторизацию',
  'формирует динамическую главную страницу',
  'выполняет поиск по сущностям',
  'загружает и раздаёт медиафайлы',
  'публикует OpenAPI-документацию',
], C.green)

// 10. Backend
newSlide()
title('Разработка backend-части', 'FastAPI · async · PostgreSQL')
const backendCards = [
  ['REST API', '25+ эндпоинтов в группах auth, sellers, products, services, search, home, media и users.'],
  ['Авторизация', 'JWT (HS256), bcrypt-хеширование пароля, OAuth2 Bearer и разграничение ролей seller / buyer.'],
  ['ORM и схемы', 'SQLAlchemy 2.x async, asyncpg и Pydantic-схемы для валидации и сериализации данных.'],
  ['Поиск', 'ILIKE-поиск по товарам, мастер-классам, мастерам и тегам с ограничением выборки.'],
  ['Медиа', 'Загрузка изображений и статическая раздача файлов из каталога uploads.'],
  ['Инициализация', 'Создание схемы БД и seed-данные с мастерами, товарами, услугами, тегами и блог-постами.'],
]
backendCards.forEach(([name, text], i) => {
  const col = i % 2
  const row = Math.floor(i / 2)
  statCard(MARGIN + col * 117, 30 + row * 28, 112, 22, name, text, col === 0 ? C.accent : C.accent2)
})
roundedRect(MARGIN, 118, CW, 10, 3, C.darkBg, C.darkBg)
writeLines('POST /auth/register → POST /auth/login → Bearer JWT → CRUD товаров и услуг → GET /search', MARGIN + 5, 124.5, CW - 10, 7.8, C.green)

// 11. Frontend
newSlide()
title('Разработка frontend-части', 'React · TypeScript · SPA')
const frontendCards = [
  ['React + TypeScript', 'Типизированные компоненты и строгие контракты с API.'],
  ['React Router', 'SPA-навигация по страницам каталога, карточек, кабинетов и авторизации.'],
  ['Zustand', 'Лёгкое управление состоянием авторизации и UI.'],
  ['Three.js hero', 'Анимированная 3D-сцена на главной странице.'],
  ['Live search', 'Debounced-поиск по сущностям в шапке сайта.'],
  ['Image upload', 'Загрузка фото товаров и мастер-классов в кабинете продавца.'],
]
frontendCards.forEach(([name, text], i) => {
  const col = i % 3
  const row = Math.floor(i / 3)
  statCard(MARGIN + col * 78, 30 + row * 32, 74, 26, name, text, C.accent)
})
roundedRect(MARGIN, 100, CW, 16, 3, C.lightBg, C.border)
writeLines('Основные страницы: главная, каталоги товаров и услуг, карточка товара, карточка мастер-класса, профиль мастера, поиск, истории, кабинеты продавца и покупателя, авторизация.', MARGIN + 4, 109, CW - 8, 8)

// 12. Кабинеты
newSlide()
title('Личные кабинеты', 'Продавец и покупатель')
headerCard(MARGIN, 30, 112, 95, 'Кабинет продавца', [
  'редактирование профиля мастера',
  'создание и редактирование товаров с фото и тегами',
  'создание мастер-классов и управление расписанием',
  'публикация блог-постов',
  'просмотр собственных товаров и услуг',
], C.accent)
headerCard(132, 30, 112, 95, 'Кабинет покупателя', [
  'просмотр профиля и данных аккаунта',
  'локальная корзина товаров',
  'локальные записи на мастер-классы',
  'изменение display_name',
  'дальнейшее развитие: серверная корзина, оплата, чаты',
], C.accent2)

// 13. Результаты
newSlide()
title('Результаты работы', 'Что реализовано и что планируется')
writeLines('Реализовано (MVP)', MARGIN, 31, 60, 10.5, C.text, true)
bulletList([
  'полный backend на FastAPI с 25+ эндпоинтами и JWT-авторизацией',
  'frontend SPA с каталогом, поиском, карточками и кабинетами',
  'демонстрационные данные: мастера, товары, мастер-классы и блог-посты',
  'контейнеризация и развёртывание на VPS через Docker Compose',
], MARGIN, 39, 104, C.green, 8.2, 1.8)
writeLines('Планируется', 132, 31, 50, 10.5, C.text, true)
bulletList([
  'серверная корзина и оформление заказов',
  'полнотекстовый поиск PostgreSQL FTS',
  'система отзывов и рейтингов',
  'чаты мастер — ученик после мастер-класса',
  'расширение миграций и devops-процессов',
], 132, 39, 102, C.orange, 8.2, 1.8)
roundedRect(MARGIN, 93, CW, 15, 3, C.lightBg, C.border)
writeLines('Сайт в текущем состоянии доступен по адресу: http://93.183.71.133:18501', MARGIN + 5, 102, CW - 10, 8.7, C.accent2, true)
roundedRect(MARGIN, 114, CW, 10, 3, C.panel, C.border)
setFill(C.green)
doc.roundedRect(MARGIN + 2, 116, (CW - 4) * 0.65, 6, 2, 2, 'F')
writeLines('Готовность MVP: около 65% от полного объёма технического задания', MARGIN + 5, 121, CW - 10, 7.6, C.white, true)

// 14. Скриншоты платформы 1
newSlide()
title('Скриншоты платформы', 'Главная страница и карточка товара')
imagePanel(screenshots.home, MARGIN, 28, 112, 92, 'Главная страница платформы CraftSphere')
imagePanel(screenshots.product, 132, 28, 112, 92, 'Карточка товара с описанием и визуальным представлением')

// 15. Скриншоты платформы 2
newSlide()
title('Скриншоты платформы', 'Мастер-классы и профиль мастера')
imagePanel(screenshots.service, MARGIN, 28, 112, 92, 'Карточка мастер-класса / услуги')
imagePanel(screenshots.seller, 132, 28, 112, 92, 'Профиль мастера с описанием и контентом')

// 16. Выводы
newSlide()
title('Выводы')
const conclusions = [
  'Выявлена потребность в единой платформе для handmade-мастеров и их клиентов.',
  'Сравнительный анализ аналогов показал отсутствие комплексного решения на рынке.',
  'Спроектирована архитектура платформы с SPA-клиентом, REST API и PostgreSQL.',
  'Реализован работающий MVP с каталогом, поиском, кабинетами и seed-данными.',
  'Платформа может развиваться как полноценная экосистема для продажи изделий и организации мастер-классов.',
]
conclusions.forEach((item, i) => {
  roundedRect(MARGIN, 28 + i * 19, CW, 14, 3, C.panel, C.border)
  setFill(C.accent)
  doc.circle(MARGIN + 7, 35 + i * 19, 4.5, 'F')
  doc.setFont('DejaVu', 'bold')
  doc.setFontSize(9.5)
  setColor(C.white)
  doc.text(String(i + 1), MARGIN + 7, 36.5 + i * 19, { align: 'center' })
  writeLines(item, MARGIN + 16, 36 + i * 19, CW - 22, 8.5)
})

// 17. Спасибо
newSlide(C.darkBg, false)
doc.setFont('DejaVu', 'bold')
doc.setFontSize(24)
setColor(C.white)
doc.text('Спасибо за внимание!', W / 2, H / 2, { align: 'center' })

const outPath = path.resolve(__dirname, 'presentation_vkr.pdf')
fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')))
console.log('PDF saved to:', outPath)
console.log('Slides:', slideCount)
