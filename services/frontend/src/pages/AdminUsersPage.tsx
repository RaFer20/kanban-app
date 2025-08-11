import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authApi, boardApi } from "../lib/api";
import { SimpleModal } from "../components/SimpleModal";

interface User {
  id: number;
  email: string;
  role: string;
  created_at?: string | null;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const [selectedUser, setSelectedUser] = useState<null | { id: number; email: string }>(null);
  const [userBoards, setUserBoards] = useState<Array<{ board: any; role: string }>>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  function formatUserDate(user: User): string {
    const dateString = user.created_at || (user as any).createdAt || (user as any).date_created;
    
    if (!dateString) {
      return 'N/A';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await authApi.getAllUsers();
      setUsers(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: number, role: string) {
    try {
      await authApi.updateUserRole(userId, role);
      setEditingUser(null);
      setNewRole("");
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  }

  const handleViewDetails = async (user: { id: number; email: string }) => {
    setSelectedUser(user);
    setLoadingBoards(true);
    setError(null);
    try {
      const boards = await boardApi.getUserBoards(user.id);
      setUserBoards(boards);
    } catch (e: any) {
      setError(e.message || "Failed to load boards");
    }
    setLoadingBoards(false);
  };

  if (loading) return <div className="p-8">Loading users...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Link 
          to="/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back to Admin
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-800">All Users ({users.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
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
              {users.map((user) => {
                // Protect the guest account from editing
                const isGuestAccount = user.email === "guest@example.com";

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id && !isGuestAccount ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select role</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {/* Only show guest option if this IS the guest user */}
                            {isGuestAccount && <option value="guest">Guest</option>}
                          </select>
                          <button
                            onClick={() => handleRoleChange(user.id, newRole)}
                            disabled={!newRole}
                            className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              setNewRole("");
                            }}
                            className="px-2 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-800' 
                              : user.role === 'guest'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                            {isGuestAccount && <span className="ml-1">👤</span>}
                          </span>
                          {!isGuestAccount && (
                            <button
                              onClick={() => {
                                setEditingUser(user.id);
                                setNewRole(user.role);
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Edit
                            </button>
                          )}
                          {isGuestAccount && (
                            <span className="text-xs text-gray-500">System Account</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatUserDate(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewDetails(user)} 
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {selectedUser && (
        <SimpleModal open={true} onClose={() => setSelectedUser(null)}>
          <h2 className="text-xl font-bold mb-4">User: {selectedUser.email}</h2>
          {loadingBoards ? (
            <div>Loading boards...</div>
          ) : (
            <>
              {userBoards.length === 0 ? (
                <div className="text-gray-500">No boards found for this user.</div>
              ) : (
                <table className="w-full mb-4">
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1">Board Name</th>
                      <th className="text-left px-2 py-1">Board ID</th>
                      <th className="text-left px-2 py-1">Role</th>
                      <th className="text-left px-2 py-1">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBoards.map(({ board, role }) => (
                      <tr key={board.id}>
                        <td className="px-2 py-1">{board.name}</td>
                        <td className="px-2 py-1">{board.id}</td>
                        <td className="px-2 py-1">{role}</td>
                        <td className="px-2 py-1">
                          <Link to={`/boards/${board.id}`} className="text-blue-600 underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </>
          )}
        </SimpleModal>
      )}
    </div>
  );
}