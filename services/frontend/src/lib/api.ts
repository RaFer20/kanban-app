import type { Board } from "../types/board";

// API utility functions

const API_BASE = ''; // Empty since we're using proxy in nginx

class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  if (!response.ok) {
    let message = `HTTP error! status: ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
      if (data?.message) message = data.message;
    } catch {
      // fallback to default message
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    return apiRequest<{ access_token: string; user_id?: number }>('/api/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
  },

  async getMe() {
    return apiRequest<{ id: number; email: string; is_active: boolean }>('/api/v1/me');
  },

  async register(email: string, password: string) {
    return apiRequest<{ id: number; email: string }>('/api/v1/users/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    const response = await fetch('/api/v1/logout', {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok && response.status !== 204) {
      throw new ApiError(response.status, 'Logout failed');
    }
    return;
  },

  async getAllUsers() {
    return apiRequest<Array<{ id: number; email: string }>>("/api/v1/admin/users");
  },
};

// Board API
export const boardApi = {
  async getBoards(limit = 10, offset = 0) {
    return apiRequest<{
      items: Array<{ id: number; name: string; createdAt: string; updatedAt: string }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/api/board/boards?limit=${limit}&offset=${offset}`);
  },

  async createBoard(name: string) {
    return apiRequest<{ id: number; name: string; createdAt: string; updatedAt: string }>('/api/board/boards', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async getBoard(boardId: number) {
    return apiRequest<{
      id: number;
      name: string;
      createdAt: string;
      updatedAt: string;
    }>(`/api/board/boards/${boardId}`);
  },
  async getBoardColumns(boardId: number) {
    return apiRequest<Array<{
      id: number;
      name: string;
      order: number;
      tasks: Array<{ id: number; title: string; order: number }>;
    }>>(`/api/board/boards/${boardId}/columns`);
  },
  async createColumn(boardId: number, name: string) {
    return apiRequest<{ id: number; name: string; order: number; boardId: number }>(
      `/api/board/boards/${boardId}/columns`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );
  },
  async createTask(columnId: number, title: string, description?: string) {
    return apiRequest<{ id: number; title: string; description?: string; order: number; columnId: number }>(
      `/api/board/columns/${columnId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify({ title, description }),
      }
    );
  },
  async updateColumn(columnId: number, data: { name?: string; order?: number }) {
    return apiRequest<{ id: number; name: string; order: number }>(
      `/api/board/columns/${columnId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  async deleteColumn(columnId: number) {
    return apiRequest<{ message: string }>(
      `/api/board/columns/${columnId}`,
      {
        method: "DELETE",
      }
    );
  },
  async updateTask(
    taskId: number,
    data: { title?: string; description?: string; columnId?: number; order?: number }
  ) {
    return apiRequest<{ id: number }>(`/api/board/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteTask(taskId: number) {
    return apiRequest<{ message: string }>(
      `/api/board/tasks/${taskId}`,
      {
        method: "DELETE",
      }
    );
  },

  async getOwnedBoards(limit = 10, offset = 0) {
    return apiRequest<{ items: Board[]; total: number; limit: number; offset: number }>(
      `/api/board/boards/owned?limit=${limit}&offset=${offset}`
    );
  },

  async getAllBoardsAdmin() {
    return apiRequest<Board[]>("/api/board/admin/boards");
  },
  async resetDemoData() {
    return apiRequest<{ message: string }>("/api/board/admin/reset-demo", {
      method: "POST",
    });
  },
};

export { ApiError };