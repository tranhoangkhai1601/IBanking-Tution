# IBanking Pay Tuition

**Base URL:** `http://localhost/api/v1`
**Format:** JSON
**Authentication:** HTTP-only cookies (`access_token`, `refresh_token`)

## 1. Authentication

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| POST   | `/auth/login`   | Authenticate user    |
| PUT    | `/auth/refresh` | Refresh access token |
| DELETE | `/auth/logout`  | Log out user         |

## 2. Customers

| Method | Endpoint                       | Description                                    |
| ------ | ------------------------------ | ---------------------------------------------- |
| GET    | `/customers/me`              | Get current customer profile and bank accounts |
| GET    | `/customers/me/transactions` | Get customer transaction history               |

## 3. Tuition

| Method | Endpoint                  | Description                                |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | `/tuition/{student_id}` | Retrieve unpaid tuition fees for a student |

## 4. Payments

| Method | Endpoint                       | Description                         |
| ------ | ------------------------------ | ----------------------------------- |
| POST   | `/payments/tuition`          | Create a tuition payment            |
| GET    | `/payments/{transaction_id}` | Retrieve payment transaction status |

**Payment Request Requirements:**

- Requires `Idempotency-Key` header.
- Request body includes `account_id`, `student_id`, `tuition_id`, and optional `description`.
- Payment amount is retrieved from the tuition record.

**Payment Response:** Returns transaction ID, account ID, tuition ID, amount, and initial status (`PENDING`).

**Payment Statuses:**

| Status  | Description                |
| ------- | -------------------------- |
| PENDING | Payment is being processed |
| SUCCESS | Payment completed          |
| FAILED  | Payment failed             |

## 5. HTTP Status Codes

| Code | Description         |
| ---- | ------------------- |
| 401  | Unauthorized        |
| 404  | Resource not found  |
| 409  | Conflict            |
| 422  | Invalid request     |
| 502  | Bad gateway         |
| 503  | Service unavailable |
