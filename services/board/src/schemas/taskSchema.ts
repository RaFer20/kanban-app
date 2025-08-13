import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assigneeId: z.number().int().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  columnId: z.number().int().optional(),
  assigneeId: z.number().int().nullable().optional(),
});