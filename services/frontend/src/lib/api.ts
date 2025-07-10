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
  // Remove token logic
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
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
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
};

// Board API
export const boardApi = {
  async getBoards(limit = 10, offset = 0) {
    return apiRequest<{
      items: Array<{ id: number; name: string; createdAt: string; updatedAt: string }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/api/board/api/boards?limit=${limit}&offset=${offset}`);
  },

  async createBoard(name: string) {
    return apiRequest<{ id: number; name: string; createdAt: string; updatedAt: string }>('/api/board/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async getBoard(boardId: number) {
    return apiRequest(`/api/board/api/boards/${boardId}`);
  },

  async getBoardColumns(boardId: number) {
    return apiRequest<Array<{
      id: number;
      name: string;
      order: number;
      tasks: Array<{ id: number; title: string; order: number }>;
    }>>(`/api/board/api/boards/${boardId}/columns`);
  },
};

export { ApiError };