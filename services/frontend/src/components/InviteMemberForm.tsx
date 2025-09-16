import { useState } from "react";

interface InviteMemberFormProps {
  users: { id: number; email: string }[];
  members: { userId: number; role: string }[];
  onInvite: (userId: number, role: string) => Promise<void>;
}

export function InviteMemberForm({ users, members, onInvite }: InviteMemberFormProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [role, setRole] = useState("EDITOR");
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = users
    .filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    .filter(u => !members.some(m => m.userId === u.id))
    .filter(u => !u.email.endsWith("@boardtests.com"));

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedUser) {
      setError("Select a user to invite.");
      return;
    }
    try {
      await onInvite(selectedUser, role);
      setSearch("");
      setSelectedUser(null);
      setRole("EDITOR");
    } catch (err: any) {
      setError(err.message || "Failed to invite user");
    }
  }

  return (
    <form
      onSubmit={handleInvite}
      className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-4"
    >
      <input
        type="text"
        placeholder="Search email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border px-2 py-1 rounded w-full sm:w-56"
      />
      <select
        value={selectedUser ?? ""}
        onChange={e => setSelectedUser(Number(e.target.value))}
        className="border px-2 py-1 rounded w-full sm:w-56"
        required
      >
        <option value="">Select user</option>
        {filteredUsers.map(u => (
          <option key={u.id} value={u.id}>
            {u.email.length > 24
              ? `${u.email.slice(0, 22)}… (ID: ${u.id})`
              : `${u.email} (ID: ${u.id})`}
          </option>
        ))}
      </select>
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        className="border px-2 py-1 rounded w-full sm:w-auto"
      >
        <option value="EDITOR">EDITOR</option>
        <option value="VIEWER">VIEWER</option>
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-1 rounded w-full sm:w-auto"
        disabled={!selectedUser}
      >
        Invite
      </button>
      {error && <span className="text-red-600 sm:ml-2 mt-2 sm:mt-0">{error}</span>}
    </form>
  );
}