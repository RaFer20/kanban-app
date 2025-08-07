import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Column } from "../types/board";
import { boardApi } from "../lib/api";

export function useBoardDnD(columns: Column[], fetchColumns: () => Promise<void>) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Add error state

  async function handleDragEnd(event: DragEndEvent) {
    setError(null);
    const { active, over } = event;
    if (!over) return;

    // --- COLUMN DRAG ---
    if (
      !isNaN(Number(active.id)) &&
      !isNaN(Number(over.id)) &&
      columns.some(col => col.id.toString() === active.id) &&
      columns.some(col => col.id.toString() === over.id)
    ) {
      const oldIndex = columns.findIndex(col => col.id.toString() === active.id);
      const newIndex = columns.findIndex(col => col.id.toString() === over.id);
      if (oldIndex !== newIndex) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        for (let i = 0; i < newColumns.length; i++) {
          if (newColumns[i].order !== i + 1) {
            await boardApi.updateColumn(newColumns[i].id, { order: i + 1 });
          }
        }
        await fetchColumns();
      }
      return;
    }

    // --- TASK DRAG ---
    const sourceCol = columns.find(col =>
      col.tasks.some(t => t.id.toString() === active.id)
    );

    let destCol: Column | undefined;
    destCol = columns.find(col =>
      col.tasks.some(t => t.id.toString() === over.id)
    );
    if (!destCol && typeof over.id === "string" && over.id.startsWith("col-")) {
      const colId = Number(over.id.replace("col-", ""));
      destCol = columns.find(col => col.id === colId);
    }

    if (!sourceCol || !destCol) return;

    if (sourceCol.id === destCol.id) {
      const oldIndex = sourceCol.tasks.findIndex(
        t => t.id.toString() === active.id
      );
      const newIndex = destCol.tasks.findIndex(
        t => t.id.toString() === over.id
      );
      if (newIndex === -1) {
        await boardApi.updateTask(sourceCol.tasks[oldIndex].id, { order: destCol.tasks.length });
        await fetchColumns();
        return;
      }
      if (oldIndex !== newIndex) {
        const newTasks = arrayMove(sourceCol.tasks, oldIndex, newIndex);
        for (let i = 0; i < newTasks.length; i++) {
          if (newTasks[i].order !== i + 1) {
            await boardApi.updateTask(newTasks[i].id, { order: i + 1 });
          }
        }
        await fetchColumns();
      }
    } else {
      const task = sourceCol.tasks.find(t => t.id.toString() === active.id);
      if (task) {
        try {
          await boardApi.updateTask(task.id, {
            columnId: destCol.id,
            order: destCol.tasks.length + 1,
          });
          await fetchColumns();
        } catch (err: any) {
          // Show backend error message if present
          if (err?.status === 409 && err?.message) {
            setError(err.message);
          } else if (err?.message) {
            setError(err.message);
          } else {
            setError("Failed to update task.");
          }
        }
      }
    }
  }

  return {
    activeTaskId,
    setActiveTaskId,
    activeColumnId,
    setActiveColumnId,
    handleDragEnd,
    error,
    setError,
  };
}