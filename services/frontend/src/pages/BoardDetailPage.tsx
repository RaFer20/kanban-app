import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableColumn, TaskModal, ColumnModal, SimpleModal, AddColumnForm, BoardHeader, BoardDragOverlay } from "../components";
import { useBoardDnD } from "../hooks/useBoardDnD";
import { useBoardDetailState } from "../hooks/useBoardDetailState";
import { useBoardDetailData } from "../hooks/useBoardDetailData";
import { useAuth } from "../hooks/useAuth";
import type { Task, Column } from "../types/board";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { authApi } from "../lib/api";

export function BoardDetailPage() {
  const { boardId } = useParams();
  const { board, columns, loading, error, fetchColumns } = useBoardDetailData(boardId);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: number; email: string }[]>([]);

  const {
    selectedTask, setSelectedTask, showTaskModal, setShowTaskModal,
    selectedColumn, setSelectedColumn, showColumnModal, setShowColumnModal,
  } = useBoardDetailState();

  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const {
    handleDragEnd,
    error: dndError,
    setError: setDndError,
  } = useBoardDnD(columns, fetchColumns);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const allUsers = await authApi.getAllUsers();
        setUsers(allUsers.map(u => ({ id: u.id, email: u.email })));
      } catch (err) {
        setUsers([]);
      }
    }
    fetchUsers();
  }, []);

  if (loading) return <div className="p-8">Loading board...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!board) return <div className="p-8">Board not found.</div>;

  function handleTaskClick(task: Task) {
    setSelectedTask(task);
    setShowTaskModal(true);
  }

  function handleColumnClick(col: Column) {
    setSelectedColumn(col);
    setShowColumnModal(true);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id.toString());
    if (columns.some(col => col.id.toString() === event.active.id)) {
      setActiveColumnId(event.active.id.toString());
    }
  }

  function handleDragEndWrapper(event: DragEndEvent) {
    setActiveTaskId(null);
    setActiveColumnId(null);
    handleDragEnd(event);
  }

  function handleDragCancel() {
    setActiveTaskId(null);
    setActiveColumnId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndWrapper}
      onDragCancel={handleDragCancel}
    >
      <div className="p-8">
        <BoardHeader
          boardName={board.name}
          onAddColumn={() => setShowAddColumn(true)}
        />
        <SimpleModal open={showAddColumn} onClose={() => setShowAddColumn(false)}>
          <AddColumnForm
            boardId={Number(boardId)}
            onAdded={() => {
              setShowAddColumn(false);
              fetchColumns();
            }}
            onCancel={() => setShowAddColumn(false)}
          />
        </SimpleModal>
        {dndError && (
          <div className="p-2 mb-2 bg-red-100 text-red-700 rounded">
            {dndError}
            <button className="ml-2 text-xs underline" onClick={() => setDndError(null)}>Dismiss</button>
          </div>
        )}
        <div className="flex gap-4">
          <SortableContext
            items={columns.map(col => col.id.toString())}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map(col => (
              <SortableColumn
                key={col.id}
                col={col}
                tasks={col.tasks}
                activeTaskId={activeTaskId}
                activeColumnId={activeColumnId}
                onTaskClick={handleTaskClick}
                onColumnClick={handleColumnClick}
                onChanged={fetchColumns}
              />
            ))}
          </SortableContext>
        </div>
        {showTaskModal && selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setShowTaskModal(false)}
            onChanged={fetchColumns}
            user={user}
            boardMembers={board.members || []}
            users={users}
          />
        )}
        {showColumnModal && selectedColumn && (
          <ColumnModal
            column={selectedColumn}
            onClose={() => setShowColumnModal(false)}
            onChanged={() => {
              setShowColumnModal(false);
              fetchColumns();
            }}
          />
        )}
        <DragOverlay>
          <BoardDragOverlay
            activeColumnId={activeColumnId}
            activeTaskId={activeTaskId}
            columns={columns}
          />
        </DragOverlay>
      </div>
    </DndContext>
  );
}