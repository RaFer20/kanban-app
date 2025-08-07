import { useState } from "react";
import type { Task, Column } from "../types/board";

export function useBoardDetailState() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);

  return {
    selectedTask, setSelectedTask, showTaskModal, setShowTaskModal,
    selectedColumn, setSelectedColumn, showColumnModal, setShowColumnModal,
  };
}