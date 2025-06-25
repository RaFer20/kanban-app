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
  - `200 OK`: `[ ...board objects ]`

  **Response Example:**
  ```json
  [
    {
      "id": 1,
      "name": "Project Board",
      "createdAt": "2025-06-24T12:34:56.789Z",
      "updatedAt": "2025-06-24T12:34:56.789Z"
    }
  ]
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
    "createdAt": "2025-06-24T12:36:00.000Z",
    "updatedAt": "2025-06-24T12:36:00.000Z"
  }
  ```

- **GET `/api/columns/:columnId/tasks`**  
  List tasks in a column.

  **Response Example:**
  ```json
  [
    {
      "id": 1,
      "title": "Task 1",
      "description": "Optional",
      "columnId": 1,
      "order": 1,
      "createdAt": "2025-06-24T12:36:00.000Z",
      "updatedAt": "2025-06-24T12:36:00.000Z"
    }
  ]
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
