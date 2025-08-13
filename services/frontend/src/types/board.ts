export type Board = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    userId: number;
    email: string;
    role: "OWNER" | "EDITOR" | "VIEWER";
  }>;
};

export type Column = {
  id: number;
  name: string;
  order: number;
  boardId?: number;
  tasks: Task[];
};

export type Task = {
  id: number;
  title: string;
  order: number;
  assigneeId?: number | null;
  description?: string;
  columnId?: number;
};