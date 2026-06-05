# Payment Processor

Небольшой Express-сервис для тестового задания: создание счетов, прием webhook-статусов оплаты и защита денежных операций от повторной обработки.

## Стек

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Redis
- Jest + Supertest
- Swagger UI

## Быстрый старт

```bash
npm install
cp .env.example .env
docker compose up -d
npm run seed:merchant
npm run dev
```

По умолчанию приложение ожидает MongoDB на `mongodb://localhost:27017/payment_processor` и Redis на `redis://localhost:6379`.

MongoDB и Redis можно поднять локально через Docker Compose:

```bash
docker compose up -d
```

Проверить статус контейнеров:

```bash
docker compose ps
```

Проверка, что сервер жив:

```bash
curl http://localhost:3000/health
```

Swagger UI доступен по адресу:

```text
http://localhost:3000/api-docs
```

Для проверки `POST /invoice` через Swagger нужен мерчант с настройкой комиссии. Команда `npm run seed:merchant` создает или обновляет тестового мерчанта:

```json
{
  "merchantId": "merchant-1",
  "feePercent": "2.5"
}
```

## API

### POST /invoice

Создает счет со статусом `pending`.

```bash
curl -X POST http://localhost:3000/invoice \
  -H "Content-Type: application/json" \
  -d '{"amount":"100.00","currency":"USD","merchantId":"merchant-1"}'
```

`amount` передается строкой. Количество знаков после точки проверяется по minor units валюты: например, USD/EUR/RUB/TRY/GBP — 2, JPY — 0, KWD — 3. `currency` должен быть поддерживаемым трехбуквенным кодом валюты.

Пример ответа:

```json
{
  "data": {
    "invoiceId": "665f6f1e8b3f3d49e57a6e11",
    "merchantId": "merchant-1",
    "amount": "100.00",
    "currency": "USD",
    "feePercent": "2.5",
    "fee": "2.50",
    "amountToReceive": "97.50",
    "status": "pending"
  }
}
```

## Структура

- `routes` описывают URL и middleware.
- `controllers` принимают HTTP-запрос и формируют HTTP-ответ.
- `services` содержат бизнес-логику и работу с моделями.
- `models` описывают Mongoose-сущности.
- `validators` содержат схемы валидации входных данных.

## Тесты

```bash
npm run typecheck
npm test
```

`npm test` запускает Jest с coverage. Порог покрытия настроен на 100% для statements, branches, functions и lines.

Production build:

```bash
npm run build
npm start
```

## Текущий статус

Реализовано создание инвойса: настройки комиссии берутся из коллекции мерчантов, суммы считаются через decimal arithmetic, а в MongoDB сохраняются как integer minor units (`amountMinor`, `feeMinor`, `amountToReceiveMinor`) вместе с `currencyScale`. `feePercent` считается обычным процентом: `2.5` означает `2.5%`. Мерчанты пока считаются заранее заведенными в базе.

Следующие шаги: webhook-подпись, nonce/idempotency, получение статуса инвойса и тесты денежных сценариев webhook.
