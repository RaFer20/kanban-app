import { useState } from "react";
import { InviteMemberForm } from "./InviteMemberForm";

type Member = {
  userId: number;
  role: "OWNER" | "EDITOR" | "VIEWER";
};

type User = {
  id: number;
  email: string;
};

interface ManageMembersPanelProps {
  members: Member[];
  users: User[];
  onInvite: (userId: number, role: string) => Promise<void>;
  onRemove: (userId: number) => Promise<void>;
  onChangeRole: (userId: number, role: string) => Promise<void>;
}

export function ManageMembersPanel({
  members,
  users,
  onInvite,
  onRemove,
  onChangeRole,
}: ManageMembersPanelProps) {
  const [addMode, setAddMode] = useState(false);

  return (
    <div className="p-4 sm:p-6 bg-white rounded shadow mb-4">
      <h2 className="font-bold mb-2 text-lg sm:text-xl">Board Members</h2>
      <div className="overflow-x-auto">
        <table className="w-full mb-2 text-sm sm:text-base">
          <thead>
            <tr>
              <th className="text-left">Email</th>
              <th className="text-left">Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.userId}>
                <td>{users.find(u => u.id === m.userId)?.email || m.userId}</td>
                <td>
                  <select
                    value={m.role}
                    onChange={e => onChangeRole(m.userId, e.target.value)}
                    className="border px-2 py-1 rounded w-full sm:w-auto"
                    disabled={m.role === "OWNER"}
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </td>
                <td>
                  {m.role !== "OWNER" && (
                    <button
                      className="text-red-600 hover:underline w-full sm:w-auto"
                      onClick={() => onRemove(m.userId)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded mb-2 w-full sm:w-auto"
        onClick={() => setAddMode(v => !v)}
      >
        {addMode ? "Cancel" : "Invite Member"}
      </button>
      {addMode && (
        <InviteMemberForm
          users={users}
          members={members}
          onInvite={onInvite}
        />
      )}
    </div>
  );
}