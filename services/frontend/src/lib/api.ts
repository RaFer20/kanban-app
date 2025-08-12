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
    return apiRequest<Array<{ 
      id: number; 
      email: string; 
      role: string; 
      created_at: string | null;
    }>>("/api/v1/admin/users");
  },

  async updateUserRole(userId: number, role: string) {
    return apiRequest<{ id: number; email: string; role: string }>(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async get<T = any>(endpoint: string) {
    return apiRequest<T>(`/api/v1${endpoint}`);
  },

  async deleteBoardTestUsers() {
    const res = await fetch("/api/v1/admin/delete-boardtest-users", {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text() || "Failed to delete test users");
    return await res.json();
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
    return apiRequest<Array<{
      id: number;
      name: string;
      ownerId: number;
      createdAt: string;
      updatedAt: string;
      deletedAt?: string | null;
    }>>("/api/board/admin/boards");
  },
  async resetDemoData() {
    return apiRequest<{ message: string; output?: string }>("/api/board/admin/reset-demo", {
      method: 'POST',
    });
  },

  async getBoardPermissions(boardId: number) {
    return apiRequest<Array<{
      userId: number;
      email: string;
      role: string;
      permissions: string[];
    }>>(`/api/board/boards/${boardId}/permissions`);
  },

  async updateMemberPermissions(boardId: number, userId: number, permissions: string[]) {
    return apiRequest<{ message: string }>(`/api/board/boards/${boardId}/members/${userId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  },

  async createCustomRole(boardId: number, roleName: string, permissions: string[]) {
    return apiRequest<{ id: number; name: string; permissions: string[] }>(`/api/board/boards/${boardId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ name: roleName, permissions }),
    });
  },

  async getBoardRoles(boardId: number) {
    return apiRequest<Array<{
      id: number;
      name: string;
      permissions: string[];
      isCustom: boolean;
    }>>(`/api/board/boards/${boardId}/roles`);
  },

  async deleteBoard(boardId: number) {
    return apiRequest<{ message: string }>(
      `/api/board/boards/${boardId}`,
      { method: "DELETE" }
    );
  },

  async restoreBoard(boardId: number) {
    return apiRequest<{ message: string }>(
      `/api/board/admin/boards/${boardId}/restore`,
      { method: "POST" }
    );
  },

  async getUserBoards(userId: number) {
    const res = await fetch(`/api/board/users/${userId}/boards`);
    if (!res.ok) throw new Error("Failed to fetch user boards");
    return res.json();
  },

  async removeBoardMember(boardId: number, userId: number) {
    return apiRequest(`/api/board/boards/${boardId}/members/${userId}`, { method: "DELETE" });
  },
  async addBoardMember(boardId: number, userId: number, role: string) {
    return apiRequest(`/api/board/boards/${boardId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    });
  },
  async updateBoardMemberRole(boardId: number, userId: number, role: string) {
    return apiRequest(`/api/board/boards/${boardId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
  async getBoardMembers(boardId: number): Promise<{ userId: number; role: string; createdAt: string; updatedAt: string; }[]> {
    return apiRequest(`/api/board/boards/${boardId}/members`);
  },
};

export { ApiError };

