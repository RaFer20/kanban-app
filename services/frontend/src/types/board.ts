export type Board = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  description?: string;
  columnId?: number;
};