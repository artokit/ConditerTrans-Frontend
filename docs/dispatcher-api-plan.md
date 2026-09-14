# API диспетчера производства

Реализовано на бэкенде в `OrderController` / `OrderService` (маршруты `api/orders/dispatcher/...`).

## Фильтрация заказов

Диспетчер видит заказы, у которых **все позиции** относятся к продуктам с `Product.CompanyId == CompanyId` из JWT (производство из токена). Черновики (`Draft`) не показываются.

## Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/orders/dispatcher?search=&status=` | Список |
| GET | `/api/orders/dispatcher/{id}` | Детали + строки |
| GET | `/api/rejection-reasons` | Системные причины и причины компании |
| POST | `/api/rejection-reasons` | Создать причину текущей компании: `{ "name" }` |
| POST | `/api/orders/dispatcher/{id}/confirm` | → `Confirmed`, `DispatcherId`, адрес производства |
| POST | `/api/orders/dispatcher/{id}/reject` | `{ "reasonId" }` → `Rejected` |
| POST | `/api/orders/dispatcher/{id}/reschedule` | `{ "newDeliveryDate", "reason" }` → `Rescheduled` (менеджер пересогласовывает — см. [manager-reschedule-api.md](./manager-reschedule-api.md)) |
| POST | `/api/orders/dispatcher/{id}/ready-for-shipment` | `{ "shipmentDate" }` → `AwaitingShipment` |
| POST | `/api/orders/dispatcher/{id}/handover` | `{ "documentsHandedOver" }` → `Shipped` |

Доступ: роль `Dispatcher` в JWT.

## Миграция

`20260914230218_AddRejectionReasons` — справочник причин, системные значения и связь причины с историей заказа. Текст причины также остаётся в `comment` как снимок на момент отказа.

```bash
dotnet ef database update --project DataAccess --startup-project API
```
