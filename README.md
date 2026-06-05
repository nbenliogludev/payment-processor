# Payment Processor

Небольшой Express-сервис для тестового задания: создание счетов, прием webhook-статусов оплаты и защита денежных операций от повторной обработки.

## Стек

- Node.js + Express
- MongoDB + Mongoose
- Redis
- Jest + Supertest

## Быстрый старт

```bash
npm install
cp .env.example .env
npm run dev
```

По умолчанию приложение ожидает MongoDB на `mongodb://localhost:27017/payment_processor` и Redis на `redis://localhost:6379`.

Проверка, что сервер жив:

```bash
curl http://localhost:3000/health
```

## Тесты

```bash
npm test
```

## Текущий статус

На этом шаге создан базовый Express-проект: конфигурация окружения, подключение MongoDB/Redis, middleware, health endpoint и тестовая настройка. Следующие шаги: модели merchant/invoice, расчет комиссии, webhook-подпись, nonce/idempotency и тесты денежных сценариев.
