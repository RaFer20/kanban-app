# Kanban Board Service API

This service powers the Kanban board backend (boards, columns, tasks).

## Endpoints

### Boards

- **POST `/api/boards`**  
  Create a new board.  
  **Body:** `{ "name": "Project Board" }`  
  **Responses:**  
  - `201 Created`: Board object  
  - `400 Bad Request`: Validation error  
  - `409 Conflict`: Duplicate name

  **Response Example:**
  ```json
  {
    "id": 1,
    "name": "Project Board",
    "createdAt": "2025-06-24T12:34:56.789Z",
    "updatedAt": "2025-06-24T12:34:56.789Z"
  }
  ```

- **GET `/api/boards`**  
  List all boards.  
  **Responses:**  
  - `200 OK`: `{ "items": [ ...board objects ], "total": totalCount, "limit": limit, "offset": offset }`

  **Response Example:**
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "Project Board",
        "createdAt": "2025-06-24T12:34:56.789Z",
        "updatedAt": "2025-06-24T12:34:56.789Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
  ```

### Columns

- **POST `/api/boards/:boardId/columns`**  
  Create a column for a board.  
  **Body:** `{ "name": "To Do" }`  
  **Responses:**  
  - `201 Created`: Column object  
  - `400 Bad Request`: Validation error  
  - `404 Not Found`: Board not found  
  - `409 Conflict`: Duplicate column name

  **Response Example:**
  ```json
  {
    "id": 1,
    "name": "To Do",
    "boardId": 1,
    "order": 1,
    "createdAt": "2025-06-24T12:35:00.000Z",
    "updatedAt": "2025-06-24T12:35:00.000Z"
  }
  ```

- **GET `/api/boards/:boardId/columns`**  
  List columns for a board.

  **Response Example:**
  ```json
  [
    {
      "id": 1,
      "name": "To Do",
      "boardId": 1,
      "order": 1,
      "createdAt": "2025-06-24T12:35:00.000Z",
      "updatedAt": "2025-06-24T12:35:00.000Z"
    }
  ]
  ```

- **PATCH `/api/columns/:columnId`**  
  Update a column (e.g., rename or reorder).  
  **Body:** `{ "name": "New Name" }`  
  **Responses:**  
  - `200 OK`: Updated column object  
  - `400 Bad Request`: Validation error  
  - `404 Not Found`: Column not found

  **Response Example:**
  ```json
  {
    "id": 1,
    "name": "New Name",
    "boardId": 1,
    "order": 1,
    "createdAt": "2025-06-24T12:35:00.000Z",
    "updatedAt": "2025-06-24T13:00:00.000Z"
  }
  ```

- **DELETE `/api/columns/:columnId`**  
  Delete a column.  
  **Responses:**  
  - `200 OK`: Deletion message  
  - `404 Not Found`: Column not found

  **Response Example:**
  ```json
  {
    "message": "Column deleted successfully"
  }
  ```

### Tasks

- **POST `/api/columns/:columnId/tasks`**  
  Create a task in a column.  
  **Body:** `{ "title": "Task 1", "description": "Optional" }`

  **Response Example:**
  ```json
  {
    "id": 1,
    "title": "Task 1",
    "description": "Optional",
    "columnId": 1,
    "order": 1,
    "assigneeId": 2,
    "createdAt": "2025-06-24T12:36:00.000Z",
    "updatedAt": "2025-06-24T12:36:00.000Z"
  }
  ```

- **GET `/api/columns/:columnId/tasks`**  
  List tasks in a column. Supports filtering and pagination via query parameters:

  | Query Param | Type    | Description                    |
  |-------------|---------|--------------------------------|
  | assigneeId  | integer | Only tasks assigned to user    |
  | status      | string  | Only tasks with this status    |
  | limit       | integer | Max number of tasks to return  |
  | offset      | integer | How many tasks to skip         |

  **Example:**
  ```
  GET /api/columns/1/tasks?assigneeId=2&status=done&limit=10&offset=0
  ```

  **Response Example:**
  ```json
  {
    "items": [
      {
        "id": 1,
        "title": "Task 1",
        "description": "Optional",
        "columnId": 1,
        "order": 1,
        "assigneeId": 2,
        "createdAt": "2025-06-24T12:36:00.000Z",
        "updatedAt": "2025-06-24T12:36:00.000Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
  ```

- **PATCH `/api/tasks/:taskId`**  
  Update a task.

  **Response Example:**
  ```json
  {
    "id": 1,
    "title": "Updated Task",
    "description": "Updated description",
    "columnId": 1,
    "order": 1,
    "createdAt": "2025-06-24T12:36:00.000Z",
    "updatedAt": "2025-06-24T13:00:00.000Z"
  }
  ```

- **DELETE `/api/tasks/:taskId`**  
  Delete a task.

  **Response Example:**
  ```json
  {
    "message": "Task deleted successfully"
  }
  ```

---

## Error Codes

- `400 Bad Request`: Invalid input
- `404 Not Found`: Resource does not exist
- `409 Conflict`: Duplicate resource
- `500 Internal Server Error`: Unexpected error

---

## Example Request

```http
POST /api/boards
Content-Type: application/json

{
  "name": "My Project"
}
```



## Tech Stack

- Node.js, Express, Prisma, PostgreSQL, TypeScript, Docker

## Observability

- Prometheus metrics are exposed at `/metrics`.
- Example metrics: `boards_created_total`, `tasks_created_total`, `http_request_duration_seconds`.
- Integrates with Prometheus/Grafana for monitoring.

## Logging

- Uses [Pino](https://getpino.io/) for structured, JSON logging.
- Logs key actions and errors with context (userId, boardId, etc).
- In development, logs are pretty-printed; in production, logs are JSON for aggregation.

## Tracing

- Distributed tracing is enabled using [OpenTelemetry](https://opentelemetry.io/).
- All incoming HTTP requests and database operations are automatically traced.
- Traces are exported to the configured OTEL Collector (`OTEL_EXPORTER_OTLP_ENDPOINT` in `.env`).
- Each service sets its own `service.name` (e.g., `board-service`, `auth-service`), allowing filtering in Grafana Tempo.
- Example TraceQL queries:
  - `{ .service.name = "board-service" }`
  - `{ .service.name = "auth-service" }`
- Logs include `trace_id` and `span_id` for easy correlation with traces.
- View traces in Grafana Tempo at [http://localhost:3000/explore?left=...](http://localhost:3001/explore).
- For more, see [OpenTelemetry docs](https://opentelemetry.io/docs/) and [Grafana Tempo docs](https://grafana.com/docs/tempo/latest/).

## Permissions (RBAC)

- Only board members can access a board, its columns, or tasks.
- Roles:
  - **OWNER:** Full control (manage board, columns, tasks, members)
  - **EDITOR:** Can manage columns and tasks
  - **VIEWER:** Read-only access
- Only OWNER can add/remove members or delete the board.

---

## Soft Deletes

- Deleting a board, column, or task does **not** permanently remove it from the database. Instead, it is marked as deleted (`deletedAt` is set).
- Soft-deleted boards, columns, and tasks are **excluded** from all list and fetch endpoints.
- Attempting to create, update, or interact with a soft-deleted board, column, or task will return a `404 Not Found` error.
- Deleting a board will also soft-delete all its columns and tasks.
- Deleting a column will also soft-delete all its tasks.

## Demo Data

- The demo boards and tasks are reset every hour.
- All changes are public and temporary.
- Board creation/deletion is disabled for the demo user.
