import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { boardApi } from "../lib/api";

interface BoardPermission {
  userId: number;
  email: string;
  role: string;
  permissions: string[];
}

interface CustomRole {
  id: number;
  name: string;
  permissions: string[];
  isCustom: boolean;
}

const ALL_PERMISSIONS = [
  'board:read',
  'board:write', 
  'board:delete',
  'column:create',
  'column:read',
  'column:write',
  'column:delete',
  'task:create',
  'task:read', 
  'task:write',
  'task:delete',
  'task:assign',
  'member:invite',
  'member:remove',
  'member:modify'
];

export function BoardPermissionsPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [permissions, setPermissions] = useState<BoardPermission[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);

  useEffect(() => {
    if (boardId) {
      fetchPermissions();
      fetchRoles();
    }
  }, [boardId]);

  async function fetchPermissions() {
    try {
      const response = await boardApi.getBoardPermissions(Number(boardId));
      setPermissions(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch permissions');
    }
  }

  async function fetchRoles() {
    try {
      const response = await boardApi.getBoardRoles(Number(boardId));
      setRoles(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePermissions(userId: number, permissions: string[]) {
    try {
      await boardApi.updateMemberPermissions(Number(boardId), userId, permissions);
      setEditingUser(null);
      setNewPermissions([]);
      await fetchPermissions();
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions');
    }
  }

  async function handleCreateRole() {
    try {
      await boardApi.createCustomRole(Number(boardId), newRoleName, newRolePermissions);
      setShowCreateRole(false);
      setNewRoleName("");
      setNewRolePermissions([]);
      await fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    }
  }

  if (loading) return <div className="p-8">Loading permissions...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Board Permissions</h1>
        <Link 
          to="/admin/boards"
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back to Boards
        </Link>
      </div>

      {/* Custom Roles Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Custom Roles</h2>
          <button
            onClick={() => setShowCreateRole(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Role
          </button>
        </div>

        {showCreateRole && (
          <div className="border rounded p-4 mb-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-3">Create New Role</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Role Name</label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Project Manager"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">Permissions</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRolePermissions([...newRolePermissions, permission]);
                        } else {
                          setNewRolePermissions(newRolePermissions.filter(p => p !== permission));
                        }
                      }}
                    />
                    <span className="text-sm">{permission}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateRole}
                disabled={!newRoleName || newRolePermissions.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Create Role
              </button>
              <button
                onClick={() => {
                  setShowCreateRole(false);
                  setNewRoleName("");
                  setNewRolePermissions([]);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{role.name}</h3>
                {role.isCustom && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Custom
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Permissions:</strong>
                <ul className="mt-1 space-y-1">
                  {role.permissions.map((permission) => (
                    <li key={permission} className="text-xs">• {permission}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Permissions Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Member Permissions</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permissions.map((permission) => (
                <tr key={permission.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {permission.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      permission.role === 'OWNER' 
                        ? 'bg-red-100 text-red-800' 
                        : permission.role === 'EDITOR'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {permission.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {editingUser === permission.userId ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_PERMISSIONS.map((perm) => (
                            <label key={perm} className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={newPermissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewPermissions([...newPermissions, perm]);
                                  } else {
                                    setNewPermissions(newPermissions.filter(p => p !== perm));
                                  }
                                }}
                              />
                              <span className="text-xs">{perm}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdatePermissions(permission.userId, newPermissions)}
                            className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              setNewPermissions([]);
                            }}
                            className="px-2 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {permission.permissions.map((perm) => (
                          <span key={perm} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {perm}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingUser !== permission.userId && (
                      <button
                        onClick={() => {
                          setEditingUser(permission.userId);
                          setNewPermissions([...permission.permissions]);
                        }}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        Edit Permissions
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}