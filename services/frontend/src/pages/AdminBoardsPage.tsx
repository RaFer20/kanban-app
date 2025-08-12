import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authApi, boardApi } from "../lib/api";
import { SimpleModal } from "../components/SimpleModal";

interface AdminBoard {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export function AdminBoardsPage() {
  const [boards, setBoards] = useState<AdminBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMembersFor, setShowMembersFor] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: number; email: string }[]>([]);

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const allUsers = await authApi.getAllUsers();
        setUsers(allUsers);
      } catch (e) {
        // handle error
      }
    }
    fetchUsers();
  }, []);

  async function fetchBoards() {
    try {
      setLoading(true);
      const response = await boardApi.getAllBoardsAdmin();
      setBoards(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(boardId: number) {
    if (!window.confirm("Are you sure you want to delete this board?")) return;
    try {
      await boardApi.deleteBoard(boardId);
      fetchBoards(); // Refresh list
    } catch (err: any) {
      setError(err.message || "Failed to delete board");
    }
  }

  async function handleRestore(boardId: number) {
    try {
      await boardApi.restoreBoard(boardId);
      fetchBoards(); // Refresh list
    } catch (err: any) {
      setError(err.message || "Failed to restore board");
    }
  }

  async function openMembers(boardId: number) {
    setShowMembersFor(boardId);
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await boardApi.getBoardMembers(boardId);
      setMembers(res);
    } catch (err: any) {
      setMembersError(err.message || "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleRemoveMember(boardId: number | null, userId: number) {
    if (boardId === null) return;
    if (!window.confirm("Remove this user from the board?")) return;
    try {
      await boardApi.removeBoardMember(boardId, userId);
      openMembers(boardId); // Refresh
    } catch (err: any) {
      setMembersError(err.message || "Failed to remove member");
    }
  }

  function getEmail(userId: number) {
    return users.find(u => u.id === userId)?.email || userId;
  }

  if (loading) return <div className="p-8">Loading boards...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Board Management</h1>
        <Link 
          to="/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back to Admin
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-800">All Boards ({boards.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {boards.map((board) => (
                <tr key={board.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {board.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {board.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {board.ownerId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmail(board.ownerId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      board.deletedAt 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {board.deletedAt ? 'Deleted' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(board.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link 
                      to={`/boards/${board.id}`}
                      className="text-blue-600 hover:text-blue-900 hover:underline"
                    >
                      View Board
                    </Link>
                    {!board.deletedAt && (
                      <button
                        className="ml-4 text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(board.id)}
                      >
                        Delete
                      </button>
                    )}
                    {board.deletedAt && (
                      <button
                        className="ml-4 text-green-600 hover:text-green-900"
                        onClick={() => handleRestore(board.id)}
                      >
                        Restore
                      </button>
                    )}
                    <button
                      className="ml-4 text-indigo-600 hover:text-indigo-900"
                      onClick={() => openMembers(board.id)}
                    >
                      Manage Members
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SimpleModal open={!!showMembersFor} onClose={() => setShowMembersFor(null)}>
        <h3 className="text-lg font-bold mb-4">Board Members</h3>
        {membersLoading ? (
          <div>Loading...</div>
        ) : membersError ? (
          <div className="text-red-600">{membersError}</div>
        ) : (
          <table className="w-full mb-4">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId}>
                  <td>{m.userId}</td>
                  <td>{getEmail(m.userId)}</td>
                  <td>{m.role}</td>
                  <td>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleRemoveMember(showMembersFor, m.userId)}
                    >
                      Remove
                    </button>
                    {/* Add change role UI here if desired */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          className="mt-2 px-4 py-2 bg-gray-200 rounded"
          onClick={() => setShowMembersFor(null)}
        >
          Close
        </button>
      </SimpleModal>
    </div>
  );
}